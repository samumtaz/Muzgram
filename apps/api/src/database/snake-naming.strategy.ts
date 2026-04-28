import { DefaultNamingStrategy } from 'typeorm';

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '');
}

export class SnakeNamingStrategy extends DefaultNamingStrategy {
  override columnName(propertyName: string, customName: string): string {
    // TypeORM 0.3.x passes propertyName as customName when no explicit name is given.
    // Only treat customName as custom if it differs from the property name.
    if (customName && customName !== propertyName) {
      return customName;
    }
    return toSnakeCase(propertyName);
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
