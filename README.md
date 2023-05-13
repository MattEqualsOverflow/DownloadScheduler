# Scheduler Node App

## Setup Instructions

1. Obtain a supported VPN client
    - https://haugene.github.io/docker-transmission-openvpn/supported-providers/
1. Create a Notion Database with the following columns:
    - Name (Title)
    - Status (Text)
    - Updated (Date)
    - Path (Text)
    - Search (Text)
    - Site (Single select)
        - Nyaa
        - 1337X
    - Cron (Text)
    - Regex (Text)
    - Url (Url)
    - Id (Text)
1. Sign up ipapi and get a token/key
1. Install docker on your machine
1. Create new docker-compose.yml file based on the docker-compose-example.yml, filling out your VPN provider information.
1. Run "docker compose up" to start docker and set it up to run on start
    - Linux: 
        - sudo systemctl enable docker
        - docker update --restart unless-stopped %docker name%
1. Install Python and transmission-rpc
    - pip install transmission-rpc -U
1. Install Node (at least version 14.17)
    - Linux:
        - curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        - sudo apt install nodejs
1. Create a new settings.yml file based on the example with all required settings