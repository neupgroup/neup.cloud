# Database Actions Architecture

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  (Components, Pages, API Routes)                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Unified Database API                                │
│           /actions/database/index.ts                             │
│                                                                   │
│  • Auto-routes to correct engine based on 'engine' parameter    │
│  • Provides consistent API across all engines                   │
│  • Type-safe operations                                         │
└───────────────┬─────────────────────────┬───────────────────────┘
                │                         │
       ┌────────▼────────┐       ┌───────▼────────┐
       │  Common Ops     │       │  Engine Router │
       │  common.ts      │       │  index.ts      │
       └────────┬────────┘       └───────┬────────┘
                │                        │
                │         ┌──────────────┴──────────────┐
                │         │                             │
                ▼         ▼                             ▼
    ┌──────────────────────────┐        ┌──────────────────────────┐
    │   MariaDB Operations     │        │  PostgreSQL Operations   │
    │  mariadb/operations.ts   │        │ postgresql/operations.ts │
    │                          │        │                          │
    │  • Database CRUD         │        │  • Database CRUD         │
    │  • User Management       │        │  • User Management       │
    │  • Query Execution       │        │  • Query Execution       │
    │  • Backup Generation     │        │  • Backup Generation     │
    └────────────┬─────────────┘        └────────────┬─────────────┘
                 │                                   │
                 ▼                                   ▼
    ┌──────────────────────────┐        ┌──────────────────────────┐
    │   MariaDB Settings       │        │  PostgreSQL Settings     │
    │  mariadb/settings.ts     │        │ postgresql/settings.ts   │
    └──────────────────────────┘        └──────────────────────────┘
                 │                                   │
                 └───────────────┬───────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │   SSH Command Layer      │
                    │  @/services/server/ssh          │
                    │                          │
                    │  • runCommandOnServer()  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Remote Server          │
                    │  • MariaDB Instance      │
                    │  • PostgreSQL Instance   │
                    └──────────────────────────┘
```

## 🔄 Data Flow

### Example: Creating a Database User

```
1. Component calls:
   createDatabaseUser(serverId, 'mariadb', dbName, user, pass)
   
2. Unified API (index.ts) receives call
   
3. Routes to engine-specific function:
   if (engine === 'mariadb') → createMariaDBUser()
   if (engine === 'postgres') → createPostgresUser()
   
4. Engine-specific function:
   - Validates inputs
   - Sanitizes database/user names
   - Constructs SQL commands
   - Calls runCommandOnServer()
   
5. SSH Service executes commands on remote server
   
6. Results flow back up the chain
   
7. Component receives OperationResult
```

## 📦 Module Dependencies

```
types.ts
  ↑
  │ (imports types)
  │
  ├─── common.ts
  ├─── mariadb/operations.ts
  ├─── mariadb/settings.ts
  ├─── postgresql/operations.ts
  └─── postgresql/settings.ts
        ↑
        │ (imports from)
        │
      index.ts (Unified API)
        ↑
        │ (imports from)
        │
   Application Code
```

## 🎯 Design Patterns Used

### 1. **Strategy Pattern**
The unified API acts as a context that delegates to the appropriate strategy (MariaDB or PostgreSQL) based on the engine parameter.

### 2. **Facade Pattern**
`index.ts` provides a simplified interface to the complex subsystems of MariaDB and PostgreSQL operations.

### 3. **Adapter Pattern**
Each engine-specific module adapts the generic database operations to the specific SQL syntax and commands of that engine.

### 4. **Single Responsibility Principle**
Each file has a single, well-defined responsibility:
- `types.ts` - Type definitions
- `common.ts` - Cross-engine operations
- `mariadb/operations.ts` - MariaDB operations only
- `postgresql/operations.ts` - PostgreSQL operations only

## 🔐 Type Safety Flow

```typescript
// 1. Define types centrally
export type DatabaseUser = {
    username: string;
    host?: string;
    permissions?: 'full' | 'read' | 'custom';
};

// 2. Use in engine-specific functions
async function listMariaDBUsers(
    serverId: string, 
    dbName: string
): Promise<DatabaseUser[]> { ... }

// 3. Re-export through unified API
export async function listDatabaseUsers(
    serverId: string,
    engine: 'mariadb' | 'postgres',
    dbName: string
): Promise<DatabaseUser[]> { ... }

// 4. Type-safe usage in components
const users: DatabaseUser[] = await listDatabaseUsers(
    serverId, 
    'mariadb', 
    dbName
);
```

## 🚀 Performance Considerations

1. **Lazy Loading**: Engine-specific modules are only loaded when needed
2. **No Overhead**: The routing layer adds minimal overhead
3. **Direct Imports**: Advanced users can import engine-specific functions directly
4. **Tree Shaking**: Unused engine code can be eliminated by bundlers

## 🧪 Testing Strategy

```
Unit Tests:
├── types.test.ts (Type validation)
├── common.test.ts (Common operations)
├── mariadb/
│   ├── operations.test.ts (MariaDB operations)
│   └── settings.test.ts (MariaDB settings)
└── postgresql/
    ├── operations.test.ts (PostgreSQL operations)
    └── settings.test.ts (PostgreSQL settings)

Integration Tests:
└── index.test.ts (Unified API routing)
```

## 📈 Scalability

Adding a new database engine (e.g., MySQL, MongoDB):

```
1. Create new directory: /actions/database/mysql/
2. Add operations.ts with engine-specific functions
3. Add settings.ts for configuration
4. Update index.ts to route to new engine
5. Update types.ts if new types needed
```

## 🔒 Security Benefits

1. **Input Sanitization**: Centralized in engine-specific modules
2. **SQL Injection Prevention**: Parameterized queries where possible
3. **Credential Isolation**: Server credentials handled by SSH service
4. **Audit Trail**: Each operation is logged at the engine level
