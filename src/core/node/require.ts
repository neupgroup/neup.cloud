
export const getRequirements = () => {
    return `
# Setup for Node.js
# Assumes Ubuntu/Debian

# 1. Install Node.js (LTS)
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi
`;
};
