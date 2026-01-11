# Universal Variable System

The Universal Variable System is a preprocessor that allows you to use dynamic variables in your commands. These variables are resolved before the command is executed on the remote server.

## Variable Syntax

Variables use the syntax: `{{namespace.variableName}}`

## Available Variables

### OS Variables (Dynamic - Resolved on Remote Server)

These variables execute commands on the target server to get real-time values:

- `{{os.availableNetworkPort_random}}` - Returns a random available port (1024-65535)
- `{{os.availableNetworkPort_first}}` - Returns the first available port starting from 1024
- `{{os.availableNetworkPort_last}}` - Returns the last available port starting from 65535
- `{{os.ramUsed}}` - Returns used RAM in MB
- `{{os.ramFree}}` - Returns free RAM in MB

### Server Variables (Context - From Server Info)

These variables are populated from the server configuration:

- `{{server.name}}` - Server name
- `{{server.publicIp}}` - Server public IP address
- `{{server.os}}` - Server operating system (linux/windows)

## Example Usage

### Example 1: Deploy with Dynamic Port
```bash
docker run -d -p {{os.availableNetworkPort_random}}:80 --name myapp nginx
```

This will find an available port on the server and use it for the container.

### Example 2: Conditional Deployment Based on RAM
```bash
echo "Free RAM: {{os.ramFree}} MB on {{server.name}}"
```

### Example 3: Multi-variable Command
```bash
docker run -d \
  -p {{os.availableNetworkPort_random}}:80 \
  -e SERVER_IP={{server.publicIp}} \
  -e SERVER_NAME={{server.name}} \
  myapp
```

## How It Works

1. **Connection**: SSH connection is established to the target server
2. **Preprocessing**: The system scans your command for `{{...}}` patterns
3. **Resolution**:
   - **Context variables** (server.*) are replaced with values from server configuration
   - **Dynamic variables** (os.*) execute commands on the remote server to get current values
4. **Execution**: The final command with all variables replaced is executed

## Platform Support

### Linux
- Uses `ss` for port checking
- Uses `free` for RAM information
- Uses `shuf` for random number generation

### Windows
- Uses PowerShell `Get-NetTCPConnection` for port checking
- Uses `Get-CimInstance Win32_OperatingSystem` for RAM information
- Uses `Get-Random` for random number generation

## Adding Custom Variables

You can pass custom variables when executing commands:

```typescript
await executeSingleCommand(
  serverId,
  command,
  template,
  commandName,
  {
    'custom.buildId': '12345',
    'custom.environment': 'production'
  }
);
```

Then use them in your command:
```bash
docker tag myapp:latest myapp:{{custom.buildId}}
```
