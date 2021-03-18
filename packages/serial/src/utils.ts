
export enum Kind {
  null = 0,
  end = 1,
  string = 2,
  number = 3,
  false = 4,
  true = 5,
  object = 6,
  array = 7,
  buffer = 8,
  undefined = 9,
  MAX = 32,
}

export const endMarker = Symbol()
