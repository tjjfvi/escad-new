
import {
  ArrayProduct,
  ArrayProductType,
  createLeafProductUtils,
  Id,
  LeafProduct,
  Product,
  ProductType,
  TupleProduct,
  TupleProductType,
  UnknownProduct,
} from "../src"

const productAId = Id.create(__filename, "@escad/core", "LeafProduct", "ProductA")
const productBId = Id.create(__filename, "@escad/core", "LeafProduct", "ProductB")
const productCId = Id.create(__filename, "@escad/core", "LeafProduct", "ProductC")
interface ProductA extends LeafProduct { readonly type: typeof productAId }
interface ProductB extends LeafProduct { readonly type: typeof productBId }
interface ProductC extends LeafProduct { readonly type: typeof productCId }
const ProductA = {
  create: (): ProductA => ({ type: productAId }),
  id: productAId,
  ...createLeafProductUtils<ProductA, "ProductA">(productAId, "ProductA"),
}
const ProductB = {
  create: (): ProductB => ({ type: productBId }),
  id: productBId,
  ...createLeafProductUtils<ProductB, "ProductB">(productBId, "ProductB"),
}
const ProductC = {
  create: (): ProductC => ({ type: productCId }),
  id: productCId,
  ...createLeafProductUtils<ProductC, "ProductC">(productCId, "ProductC"),
}

describe("createLeafProductUtils", () => {
  test("Consistent keys", () => {
    expect(Object.keys(ProductA)).toMatchSnapshot()
  })
  test(".productType", () => {
    expect(ProductA.productType).toMatchSnapshot()
  })
  describe(".isProductA", () => {
    const productA = ProductA.create()
    const productB = ProductB.create()
    test("Matches productA", () => {
      expect(ProductA.isProductA(productA)).toEqual(true)
    })
    test("Doesn't match productB", () => {
      expect(ProductA.isProductA(productB)).toEqual(false)
    })
    // Type guard
    const product: ProductA | null = ProductA.isProductA(productB) ? productB : null
    product
  })
})

const createProduct = () => TupleProduct.create([
  ProductA.create(),
  TupleProduct.create([]),
  ArrayProduct.create([ProductA.create(), ProductA.create()]),
  TupleProduct.create([ProductA.create(), ProductB.create(), ProductC.create()]),
  UnknownProduct.create(ProductB.create()),
])

// eslint-disable-next-line func-call-spacing
describe.each<readonly [string, () => Product]>([
  ["ProductA", () => ProductA.create()],
  ["TupleProduct<[]>", () => TupleProduct.create([])],
  ["TupleProduct<[ProductA, ProductB]>", () => TupleProduct.create([ProductA.create(), ProductB.create()])],
  ["ArrayProduct<ProductA>", () => ArrayProduct.create([ProductA.create(), ProductA.create()])],
  ["UnknownProduct", () => UnknownProduct.create(ProductB.create())],
  ["Complex", () => createProduct()],
] as const)("%s", (_, createProduct) => {
  test(".create", () => {
    expect(createProduct()).toMatchSnapshot()
  })
  test("Product.isProduct", () => {
    expect(Product.isProduct(createProduct())).toBe(true)
  })
  test("Product.getProductType", () => {
    expect(Product.getProductType(createProduct())).toMatchSnapshot()
  })
  test("Product.isProduct with correct ProductType", () => {
    expect(Product.isProduct(createProduct(), Product.getProductType(createProduct()))).toBe(true)
  })
  describe("Product.isProduct with wrong ProductType", () => {
    test.each([
      ["ProductC", ProductC],
      ["ArrayProduct<ProductC>", ArrayProductType.create(ProductC)],
      ["TupleProduct<[ProductA, ProductC]>", TupleProductType.create([ProductA, ProductC])],
    ] as const)("%s", (_, productType) => {
      expect(Product.isProduct(createProduct(), ProductType.fromProductTypeish<Product>(productType))).toBe(false)
    })
  })
})

describe("Product.getProductType", () => {
  test("Throw on invalid product", () => {
    expect(() => Product.getProductType(null as never)).toThrowErrorMatchingSnapshot()
  })
})

describe("ArrayProduct.create", () => {
  test("Throws on []", () => {
    expect(() => ArrayProduct.create([])).toThrowErrorMatchingSnapshot()
  })
})
