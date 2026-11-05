# Architecture

The data model and its ER diagram are in [database-model.md](database-model.md).

## Layers

These follow the PDF's architecture diagram. Integration and Publisher are left out, because this service doesn't call external APIs or publish to a broker.

```mermaid
flowchart TD
    client["React UI or client app"] -->|"JWT"| nginx["nginx<br/>same-origin proxy"]
    nginx --> routes

    subgraph api["Backend: Node and Hapi"]
        routes["Routes<br/>/api/v1, JWT, request schema"] --> controller["Controller<br/>maps errors to HTTP"]
        controller --> service["TranslationService<br/>orchestrates the steps"]
        service --> validators["Validators<br/>template and input"]
        service --> mapper["Mapper<br/>pure transformation"]
        service --> reader(["TemplateReader interface"])
        reader -.->|"implemented by"| repository["TypeOrmTemplateRepository"]
        repository --> models["TypeORM models"]
    end

    models --> db[("SQLite<br/>persistent volume")]
```

## Translating a request

A concrete example with the PDF's Rumbo request. Required fields, defaults and order all come from the database, so nothing in this flow is specific to Rumbo.

```mermaid
sequenceDiagram
    actor User as Client app or user
    participant API as Hapi routes
    participant Controller
    participant Service as TranslationService
    participant Repo as TemplateRepository
    participant DB as SQLite
    participant Mapper

    User->>API: POST /api/v1/endorse/translate<br/>Bearer JWT, producto=Rumbo, tipoEndoso=CambioFrecuencia
    alt JWT missing or invalid
        API-->>User: 401 Unauthorized
    else Input is not a flat object or has no selectors
        API-->>User: 400 Bad Request
    else Request accepted
        API->>Controller: Valid request
        Controller->>Service: translate(request)
        Service->>Repo: findActive("Rumbo", "CambioFrecuencia")
        Repo->>DB: Select active template, fields and events
        DB-->>Repo: Version 1, 12 fields, 2 events
        Repo-->>Service: TemplateDefinition
        alt No active template
            Service-->>Controller: TemplateNotFoundError
            Controller-->>User: 404 Not Found
        else Stored template is broken
            Service-->>Controller: InvalidTemplateError
            Controller-->>User: 422, details in the logs only
        else A required field is missing or has the wrong type
            Service-->>Controller: InputValidationError
            Controller-->>User: 400 with missingFields and invalidFields
        else Template and input are valid
            Service->>Mapper: toCoreRequest(template, skeleton, input)
            Note over Mapper: usuario fills NombreUsuario<br/>Defaults add TES008 and the empty TipoVigenciaEndoso<br/>Fields and events are sorted by their order
            Mapper-->>Service: Structured JSON
            Service-->>Controller: JSON and template version 1
            Controller-->>User: 200 with core JSON<br/>X-Template-Version: 1
        end
    end
```

The service only returns the JSON. Sending it to the core is outside this service's scope ([A-002](assumptions.md)).

## Adding a product without code

The main requirement of the exercise: a new product is published as data, with no rebuild or restart.

```mermaid
sequenceDiagram
    actor Operator
    participant Script as import-template script
    participant Importer as TemplateImportService
    participant Repo as TemplateRepository
    participant DB as SQLite
    actor Client as Client app
    participant API as Translate API

    Operator->>Script: Run with new-product.json
    Script->>Importer: import(file)
    Importer->>Importer: Validate file format and skeleton
    alt File is invalid
        Importer-->>Operator: Error listing the problems, nothing stored
    else Version already exists
        Importer->>Repo: exists(product, type, version)
        Repo-->>Importer: true
        Importer-->>Operator: already-exists, nothing changed
    else New version
        Importer->>Repo: insertAsActive(template)
        Repo->>DB: In one transaction: deactivate the old version, insert the new rows
        DB-->>Repo: Committed
        Importer-->>Operator: imported
        Client->>API: POST translate with the new product
        API->>DB: Read active template
        DB-->>API: New template
        API-->>Client: 200 with core JSON<br/>No code change, rebuild or restart
    end
```
