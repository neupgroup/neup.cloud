import Mapper from '@neupgroup/mapper';

// The Mapper will auto-configure from environment variables (e.g., DATABASE_URL)
// or fall back to in-memory storage if no environment configuration is found.

// You can define your schemas here. For example:
/*
Mapper.schema('users')
  .use({ connection: 'default', collection: 'users' })
  .setStructure([
    { name: 'id', type: 'int', autoIncrement: true },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' }
  ]);
*/

export default Mapper;
