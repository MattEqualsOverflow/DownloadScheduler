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
1. Setup your machine to have the data destination setup on boot
    - Linux:
        - https://linuxconfig.org/howto-mount-usb-drive-in-linux
1. Setup Samba so you can access the files from Windows
    - https://www.howtogeek.com/176471/how-to-share-files-between-windows-and-linux/
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

## Git Syncer
1. Download git
1. Create a new ssh key on your local
    - Linux
        - ssh-keygen -t ed25519 -C "%github email%"
1. Update github with your public key
1. Setup git to preserve your passcode
    - Linux
        - Create a new .ssh/config file if it does not exist and add the following lines to it
            - AddKeysToAgent yes
            - IdentityFile ~/.ssh/%private key file name%
        - Run the following command
            - ssh-add ~/.ssh/%private key file name%
1. Clone the code
    - git clone