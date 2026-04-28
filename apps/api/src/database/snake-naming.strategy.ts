import { DefaultNamingStrategy } from 'typeorm';

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '');
}

export class SnakeNamingStrategy extends DefaultNamingStrategy {
  override columnName(propertyName: string, customName: string): string {
    return customName || toSnakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return toSnakeCase(`${tableName}_${columnName ?? propertyName}`);
  }

  override relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }
}
