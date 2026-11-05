/** The example request from the challenge PDF. */
export const SAMPLE_REQUEST = {
  accidentLocation: 'San Isidro',
  depots: ['Miraflores', 'Ate'],
  graph: {
    Miraflores: { 'San Isidro': 7, Barranco: 3 },
    'San Isidro': { Miraflores: 7, Lince: 4 },
    Barranco: { Miraflores: 3, Surco: 5 },
    Lince: { 'San Isidro': 4, Surco: 6 },
    Surco: { Barranco: 5, Lince: 6, Ate: 10 },
    Ate: { Surco: 10 },
  },
};
