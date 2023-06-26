import {
  ButtonItem,
  definePlugin,
  Navigation,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses,
  ToastData,
} from "decky-frontend-lib";
import { useEffect, useState, VFC } from "react";
import { MdSwitchAccessShortcutAdd } from "react-icons/md";

const Content: VFC<{ serverAPI: ServerAPI }> = ({serverAPI}) => {
  const [lastUsedPath, setLastUsedPath] = useState<string>('')
  useEffect(()=>{
    onInit()
  },[])
  const onInit = async () => {
    let lastUsedPath = localStorage.getItem('decky-addtosteam')
    let deckyUserHome = (await serverAPI.callPluginMethod('getDeckyUserHome', {})).result
    let path = lastUsedPath || deckyUserHome
    // @ts-ignore
    setLastUsedPath(path)
  }
  const onClick = async () => {
    Navigation.CloseSideMenus()
    serverAPI.openFilePicker(
      lastUsedPath,
      true
    ).then((selection) => {
      if (!selection.realpath) { return }
      let file = selection.realpath.split(/[\\\/]/).pop()
      let filename = file ? file.split('.').shift() : undefined
      let path = selection.realpath.substring(0, selection.realpath.length - (file ? file.length : 0))
      setLastUsedPath(path)
      localStorage.setItem('decky-addtosteam', path)
      if (!file && !filename) {
        console.log(`Couldn't figure out filename for ${selection.realpath}`)
        return
      } 
      let appName = filename
      let execPath = selection.realpath
      let toastData: ToastData = {
        title: 'Added Shortcut',
        body: file,
        playSound: true,
        showToast: true
      }
      SteamClient.Apps.AddShortcut(appName, execPath, "", "")
      serverAPI.toaster.toast(toastData)
    }).catch((err) => {
      if (err == "User canceled") { return }
      console.log(err)
    })
  }

  return (
    <PanelSection title="Panel Section">
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onClick}
        >
          Add a Shortcut
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};


export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>Add to Steam</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <MdSwitchAccessShortcutAdd />,
    onDismount() {
    },
  };
});
