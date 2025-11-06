export interface Server {
    id: string;
    name: string;
    ip: string;
    os: string;
    status: 'Running' | 'Stopped' | 'Error' | 'Building';
    cpu: string;
    ram: string;
    storage: string;
    region: string;
    provider: 'aws' | 'gcp' | 'azure' | 'do';
  }
  
  const servers: Server[] = [
      {
          id: 'd9f8g7h-a1b2-c3d4-e5f6-1234567890ab',
          name: 'web-prod-01',
          ip: '104.248.144.212',
          os: 'Ubuntu 22.04 LTS',
          status: 'Running',
          cpu: '2 vCPU',
          ram: '4 GB',
          storage: '80 GB SSD',
          region: 'NYC3',
          provider: 'do'
      },
      {
          id: 'j6k5l4m-n3o2-p1q0-r9s8-0987654321fe',
          name: 'db-master-01',
          ip: '10.0.0.5',
          os: 'Debian 11',
          status: 'Running',
          cpu: '4 vCPU',
          ram: '16 GB',
          storage: '320 GB NVMe',
          region: 'us-east-1',
          provider: 'aws'
      },
      {
          id: 'x1y2z3a-b4c5-d6e7-f8g9-abcdef123456',
          name: 'worker-node-alpha',
          ip: '172.16.10.15',
          os: 'CentOS Stream 9',
          status: 'Stopped',
          cpu: '1 vCPU',
          ram: '2 GB',
          storage: '40 GB SSD',
          region: 'europe-west4',
          provider: 'gcp'
      },
      {
          id: 'p9o8i7u-y6t5-r4e3-w2q1-654321fedcba',
          name: 'staging-app-server',
          ip: '203.0.113.55',
          os: 'Ubuntu 22.04 LTS',
          status: 'Building',
          cpu: '2 vCPU',
          ram: '2 GB',
          storage: '60 GB SSD',
          region: 'AMS3',
          provider: 'do'
      },
      {
          id: 'k9j8h7g-f6e5-d4c3-b2a1-cba987654321',
          name: 'legacy-api',
          ip: '198.51.100.22',
          os: 'Windows Server 2019',
          status: 'Error',
          cpu: '2 vCPU',
          ram: '8 GB',
          storage: '100 GB HDD',
          region: 'westus2',
          provider: 'azure'
      }
  ];
  
  // Simulate fetching data from a database or API
  export const getServers = async (): Promise<Server[]> => {
    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return servers;
  };