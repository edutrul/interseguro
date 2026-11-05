# Interseguro Technical Challenge

Live demo: <https://interseguro.eduardotelaya.com/>

| Exercise | What it is | Live | Docs |
|---|---|---|---|
| **1** | Endorsement translation service (Node, Hapi, SQLite, React) | [/ejercicio-1/](https://interseguro.eduardotelaya.com/ejercicio-1/) | [README](exercise-1/README.md) |
| **2** | Optimal tow-truck routing service (Go, React) | [/ejercicio-2/](https://interseguro.eduardotelaya.com/ejercicio-2/) | [README](exercise-2/README.md) |
| **3** | Architecture design for Renta Particular loans | [/ejercicio-3/](https://interseguro.eduardotelaya.com/ejercicio-3/) | [Source page](exercise-3/architecture-design.html) |

Exercises 1 and 2 each ask for their own JWT. To run one on your own machine, follow its README.

## Deployment

All three exercises run on one Linux server behind one subdomain, with each exercise under its own path:

```
Internet -> Caddy (HTTPS) -> /             -> interseguro-home     (landing page)
                          -> /ejercicio-3/ -> interseguro-home     (static page)
                          -> /ejercicio-1/ -> interseguro-ex1-web  -> Exercise 1 API -> SQLite volume
                          -> /ejercicio-2/ -> interseguro-ex2-web  -> Exercise 2 API
```

Nothing publishes a host port. The containers join an external Docker network, and the proxy reaches them by container name.

**This is a VPS, not the free-tier cloud the PDF asks for.** See [ADR-004](exercise-1/docs/adr/004-deployment-target.md).

### Requirements
- Docker with Compose
- A DNS record pointing the subdomain at the server
- Caddy, or another reverse proxy, attached to the `launchpad_edge` Docker network

### 1. Get the code and create the network

```bash
git clone https://github.com/edutrul/interseguro.git
cd interseguro
docker network inspect launchpad_edge >/dev/null 2>&1 || docker network create launchpad_edge
```

### 2. Create each exercise's configuration

This generates a separate random secret per exercise and leaves an existing `.env` alone. Each frontend is built for its path.

```bash
for e in 1 2; do
  [ -f exercise-$e/.env ] || sed "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" exercise-$e/.env.example > exercise-$e/.env
  grep -q '^BASE_PATH=' exercise-$e/.env || echo "BASE_PATH=/ejercicio-$e/" >> exercise-$e/.env
done
```

### 3. Start everything

```bash
docker compose --project-directory exercise-1 -f exercise-1/docker-compose.yml -f exercise-1/docker-compose.server.yml up -d --build --wait
docker compose --project-directory exercise-2 -f exercise-2/docker-compose.yml -f exercise-2/docker-compose.server.yml up -d --build --wait
docker compose -f deploy/docker-compose.yml up -d --wait
```

### 4. Route the subdomain

Add [`deploy/Caddyfile.example`](deploy/Caddyfile.example) to the Caddyfile, changing the domain if needed, then reload Caddy. It requests the HTTPS certificate on the first visit.

```bash
docker exec <caddy-container> caddy reload --adapter caddyfile --config /etc/caddy/Caddyfile
```

**If the Caddyfile is bind-mounted as a single file,** a `git pull` or `git checkout` replaces the file on the host while the container keeps reading the old one. The reload then succeeds but loads the old config. Recreate the Caddy container instead, which briefly interrupts every site behind it.

### 5. Generate tokens

Tokens last one hour unless `TOKEN_TTL_SECONDS` is set. This example lasts 30 days:

```bash
docker compose --project-directory exercise-1 exec -T -e TOKEN_TTL_SECONDS=2592000 backend node dist/scripts/generate-token.js
docker compose --project-directory exercise-2 exec -T -e TOKEN_TTL_SECONDS=2592000 backend /gentoken
```

To revoke an exercise's tokens, change its `JWT_SECRET` and run step 3 again.

### 6. Verify

```bash
B=https://interseguro.eduardotelaya.com
for p in / /ejercicio-1/ /ejercicio-2/ /ejercicio-3/; do curl -s -o /dev/null -w "$p %{http_code}\n" $B$p; done
curl -s -o /dev/null -w "Exercise 1 without a token: %{http_code}\n" -X POST $B/ejercicio-1/api/v1/endorse/translate -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w "Exercise 2 without a token: %{http_code}\n" -X POST $B/ejercicio-2/api/v1/routes/optimal -H 'Content-Type: application/json' -d '{}'
```

Expect 200 for the four pages and 401 for both API calls.

### Update

```bash
git pull
```

Then run step 3 again. Exercise 1's data stays in its `sqlite-data` volume. Exercise 3 and the landing page are mounted files, so if `git pull` changed them, also run `docker compose -f deploy/docker-compose.yml up -d --force-recreate`.

### Remove

Take the block out of the Caddyfile and reload Caddy first, then:

```bash
docker compose --project-directory exercise-1 -f exercise-1/docker-compose.yml -f exercise-1/docker-compose.server.yml down
docker compose --project-directory exercise-2 -f exercise-2/docker-compose.yml -f exercise-2/docker-compose.server.yml down
docker compose -f deploy/docker-compose.yml down
```

Add `-v` to the first command to also delete Exercise 1's database.
