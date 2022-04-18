const { ipcRenderer } = require('electron');
const fs = require("fs");
const path  = require("path");
const convert = require("xml-js");
const log = require('electron-log');
const child = require('child_process').spawn;

var configData = null;
var envMap = [];
var clientDataList = [];
let selectedJsonFilePath = "";
let selectedExeFilePath = "";

function onConfigLoad(){
    //XML loading
    console.log(selectedJsonFilePath)
    if(fs.existsSync(path.join(__dirname, ".//..//..//appconfig.xml")))
    {
        var xml = fs.readFileSync(path.join(__dirname, ".//..//..//appconfig.xml"), 'utf8');
        var options = {compact: true, spaces: 4};
        var result1 = convert.xml2json(xml, options);
        configData = JSON.parse(result1);
        log.debug("JSON stringh : "+JSON.stringify(result1));
        var targetNode = configData.AppConfiguration.EnvironmentList.Environment;
        //log.debug("Environment selection list length : "+targetNode.length);
        var targetCount = Object.keys(targetNode).length;
        log.debug("Environment selection list length : "+targetCount);
        //log.debug("Environment : "+targetNode+ ":"+targetNode[0]+ ":"+targetNode[1]);
        console.log(targetNode)
        if(targetCount > 0)//targetNode.length > 0)
        {
            let k = 0;
            for(var i = 0; i <targetNode.length; i++)
                {            
                    if(targetNode[i]._attributes.Status && targetNode[i]._attributes.JsonFilePath && targetNode[i]._attributes.ExeFilePath)
                    {
                        log.debug(targetNode[i]._attributes.Status+" with JSONFile:"+targetNode[i]._attributes.JsonFilePath+" with ExeFileName:"+targetNode[i]._attributes.ExeFilePath);
                        envMap[targetNode[i]._attributes.Status] = {jsonFile: targetNode[i]._attributes.JsonFilePath, exeFile:targetNode[i]._attributes.ExeFilePath};
                        var newEnv = document.createElement('option');
                        newEnv.value = targetNode[i]._attributes.Status;
                        newEnv.text = targetNode[i]._attributes.Status;
                        let envElement = document.getElementById("env");
                        envElement.appendChild(newEnv);
                        k++;
                    }
                }
            
            log.debug("Valid Environment selection list length : "+k);
        }

        targetNode = configData.AppConfiguration.ClientList.Client;
        targetCount = Object.keys(targetNode).length;
        //log.debug("Client selection list length : "+targetNode.length);
        log.debug("Client selection list length : "+targetCount);       
            let j = 0;
            if(targetCount > 0)
            {
                for(var i = 0; i <targetNode.length; i++)
                {            
                    if(targetNode[i]._attributes.Name && targetNode[i]._attributes.Url)
                    {
                        log.debug(targetNode[i]._attributes.Name+" for Environment:"+targetNode[i]._attributes.Environment+" with Url:"+targetNode[i]._attributes.Url);
                        clientDataList.push({
                            Name: targetNode[i]._attributes.Name,
                            Environment: targetNode[i]._attributes.Environment,
                            Url: targetNode[i]._attributes.Url,
                            ExePath: targetNode[i]._attributes.ExePath
                        });
                        j++;
                    }
                }
            }
            log.debug("Valid Client selection list length : "+j);
        
        log.debug("UI updated as defined in Configuration file");
    }
    else
    {
        log.error("Configuration file appconfig.xml does not exist at location "+path.join(__dirname, ".//..//..//appconfig.xml") );
        ipcRenderer.invoke('show-dialog', ["error","Configuration file", "Configuration file appconfig.xml does not exist at location: "+path.join(__dirname, ".//..//..//")]);
    }
}

function onEnvironmentChange()
{
    log.debug("onEnvirChange");
    let selectedEnvValue = document.getElementById("env");
    log.debug("env value:"+selectedEnvValue.value);
    let clientList = document.getElementById("client");
        var newClient = document.createElement('option');
        newClient.value = "";
        newClient.text = "";
        clientList.innerHTML = "";
    if(selectedEnvValue.value){                        
        clientList.appendChild(newClient);
        selectedJsonFilePath = envMap[selectedEnvValue.value].jsonFile;
        selectedExeFilePath = envMap[selectedEnvValue.value].exeFile;
        for(var l=0; l < clientDataList.length; l++){
            if(clientDataList[l].Environment == selectedEnvValue.value){
                var newClient = document.createElement('option');
                newClient.value = clientDataList[l].Url;
                newClient.text = clientDataList[l].Name;
                clientList.appendChild(newClient);
            }
        }
    }
}

function onLaunch()
{
    let selectedValue = document.getElementById("client");
    if(selectedValue.value)
    {
    const selectedClient = selectedValue.options[selectedValue.selectedIndex].text;
    log.debug(selectedClient + " is selected to launch by user.");
    //JSON loading(replacing values)    
    let jsonFilePath = selectedJsonFilePath;
    let exeFilePath = selectedExeFilePath;
    log.debug("JsonFilePath:"+jsonFilePath);
    log.debug("ExeFilePath:"+exeFilePath);

    if(jsonFilePath && exeFilePath)
    {
        if(fs.existsSync(jsonFilePath))
        {
            let rawdata = fs.readFileSync(jsonFilePath);
            let jsonData = JSON.parse(rawdata);    
            log.debug("RawData:"+rawdata);
            console.log(jsonData);
            log.debug("Selecetd URL:"+selectedClient+", "+ selectedValue.value);
            jsonData.options.url = selectedValue.value;
            log.debug("Updated URL:"+jsonData.options.url);
            console.log(jsonData);
            let finalData = JSON.stringify(jsonData, null, 2);
            fs.writeFileSync(jsonFilePath,finalData);
            
            if(fs.existsSync(exeFilePath)){
                var clientApp = child(exeFilePath, [], {detached: true});
                clientApp.unref();
                if(typeof clientApp.pid === "number"){
                    log.info(selectedClient + " has been launched successfully");
                    ipcRenderer.invoke('show-notification', ["Application Launched", selectedClient + " has been launched successfully"]);
                }
                else{
                    log.error("Failed to launch application:"+selectedClient);
                    ipcRenderer.invoke('show-dialog', ["error","Launch Failed", selectedClient + " application failed to launch!"]);
                }
            }
            else
            {
                log.error("Cannot launch application because EXE file does not exist.");
                ipcRenderer.invoke('show-dialog', ["error","Exe file missing", "Cannot launch selected application because EXE file does not exist."]);
            }
        }
        else
        {
            log.error("Cannot launch application because JSON config file does not exist.");
            ipcRenderer.invoke('show-dialog', ["error","JSON config file missing", "Cannot launch selected application because JSON config file does not exist."]);
        }
    }
    else
    {
        log.error("Cannot launch application because invalid properties in config file.");
        ipcRenderer.invoke('show-dialog', ["error","Invalid Config File","Cannot launch selected application because invalid properties in config file. Check appconfig.exe or Contact administrator."]);
    }
    }
    else
    {
        log.error("No client selected from list to launch.");
        ipcRenderer.invoke('show-dialog', ["error","No client selected","Select a client from list to launch application!"]);
    }
}
