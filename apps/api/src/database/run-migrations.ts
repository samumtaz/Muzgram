import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { AppDataSource } from './data-source';

const command = process.argv[2] ?? 'run';

async function main() {
  await AppDataSource.initialize();

  if (command === 'run') {
    const ran = await AppDataSource.runMigrations({ transaction: 'all' });
    if (ran.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Ran ${ran.length} migration(s):`);
      ran.forEach((m) => console.log(` ✓ ${m.name}`));
    }
  } else if (command === 'revert') {
    await AppDataSource.undoLastMigration({ transaction: 'all' });
    console.log('Reverted last migration.');
  } else if (command === 'show') {
    const migrations = await AppDataSource.showMigrations();
    console.log('Pending migrations:', migrations);
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
