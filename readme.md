## Installation prerequisite for the pos system
### chrome or brave
* Download and install anny of the above browsers.

### Docker & Docker composer
Try to follow the steps using this link
1. (Install Docker on unbuntu)[https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04]

>> run `sudo docker -v`
to confirm  that docker is installed

2. (install docker composer)[https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-compose-on-ubuntu-20-04]
>> run `sudo docker-compose -v` or `sudo docker compose -v` to confirm if installed succesfully and the version

### VsCode 
* Install vscode for code editting and formatting

### Printer drivers
* Different thermal printers vary with drivers but most used are 80mm
* We use pdd files for intallation use the zip below
* more info about the printer drivers: 
> Go to settings, printer settings add new printer using pdd file


>> NOTE: Dont use snap when installing

## Lets get the project running
* Once the above setup is complete load the project both back and frontend together with the docker composer file (at the top level).
* Open the terminal and run `sudo docker compose up` or `sudo docker-compose up` it will run the project.
* Once successfull close the terminal without terminating the process and open another terminal inside the project folder and run `sudo docker compose run backend node seed.js`


## NEXT
* After making sure its running, head over to chrome/brave and enter this url `http://localhost:5373`



### Additional printer install
* install cups `sudo apt install cups` and `sudo systemctl status cups`
* install pos80 drivers by running ~`sudo chmod +x install80` and `sudo ./install80`