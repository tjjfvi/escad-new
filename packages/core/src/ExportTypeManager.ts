
import { ExportType } from "./ExportType";
import { ReadonlyArtifactManager } from "./ReadonlyArtifactManager";
import { Product, ProductType } from "./Product";

export class ExportTypeManager<P extends Product<P>> extends ReadonlyArtifactManager<ExportType<P>> {

  private static managerMap = new Map<ProductType<any>, ExportTypeManager<any>>();

  subdir: string;

  constructor(public productType: ProductType<P>){
    super();
    this.subdir = "exportTypes/" + productType.id.sha.b64;
  }

  serialize(exportType: ExportType<any>){
    return Buffer.from(JSON.stringify({
      name: exportType.name,
      extension: exportType.extension,
    }));
  }

  static get<P extends Product<P>>(productType: ProductType<P>): ExportTypeManager<P>{
    let manager = this.managerMap.get(productType) ?? new ExportTypeManager(productType);
    this.managerMap.set(productType, manager);
    return manager;
  }

}