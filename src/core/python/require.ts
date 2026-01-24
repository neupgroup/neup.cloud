
export const getRequirements = () => {
    return `
# Setup for Python
# Assumes Ubuntu/Debian

# 1. Install Python 3 and pip
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv

# 2. Install Node.js/PM2 (for process management consistency)
if ! command -v pm2 &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  sudo npm install -g pm2
fi
`;
};
