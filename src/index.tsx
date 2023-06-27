import {
  ButtonItem,
  definePlugin,
  FileSelectionType,
  Navigation,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses,
  ToastData,
  
} from "decky-frontend-lib"
import { useEffect, useState, VFC } from "react"
import { MdSwitchAccessShortcutAdd } from "react-icons/md"
import { SteamAppDetails } from "./interface"

async function getAppDetails(appID:number): Promise<SteamAppDetails|null> {
  return new Promise((resolve) => {
    let { unregister } = SteamClient.Apps.RegisterForAppDetails(appID, (details:SteamAppDetails) => {
      unregister()
      resolve(details.unAppID === undefined ? null : details)
    })
  })
}

async function addShortcut(appName: string, execPath: string): Promise<{failed: number|null, success: number|null}> {
  return new Promise((resolve) => {
    let failed:number|null = null
    let success:number|null = null
    SteamClient.Apps.AddShortcut(appName, execPath, "", "").then(async (appID:number) => {
      let appDetails = await getAppDetails(appID)
      if (appDetails && appDetails.strDisplayName && appDetails.strShortcutExe) {
        success = appID
      } else { failed = appID }
      let results = {failed: failed, success: success}
      resolve(results)
    })
  })
}

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
    let filepath = await serverAPI.openFilePickerV2(
      FileSelectionType.FILE,
      lastUsedPath,
      true,
      undefined,
      undefined,
      undefined,
      false,
      true
    )
    if (!filepath) { return }
    // @ts-ignore
    let file = filepath.realpath.split(/[\\\/]/).pop()
    let filename = file
    if (file) {
      let newfilename = file.split('.')
      newfilename.pop()
      filename = newfilename.join('.')
    }
    let path = filepath.realpath.substring(0, filepath.realpath.length - (file ? file.length : 0))
    setLastUsedPath(path)
    localStorage.setItem('decky-addtosteam', path)
    let appName = filename || file || ''
    let execPath = filepath.realpath
    let shortcutsFailed: number[] = []
    let shortcutAdded: {failed: number|null, success: number|null} = {
      failed: null,
      success: null
    }
    let attempts = 0
    while (!shortcutAdded.success && attempts < 5) {
      shortcutAdded = await addShortcut(appName, execPath)
      if (shortcutAdded.failed) { shortcutsFailed.push(shortcutAdded.failed) }
      attempts += 1
    }
    shortcutsFailed.forEach((appID) => { SteamClient.Apps.RemoveShortcut(appID) })
    console.log(`Add shortcut result (attempts ${attempts}): `, shortcutAdded.success)
    let toastData: ToastData = {
      title: '',
      body: file,
      playSound: true,
      showToast: true
    }
    if (shortcutAdded.success) {
      toastData.title = 'Added Shortcut'
      serverAPI.toaster.toast(toastData)
    } else {
      toastData.title = 'Failed to add Shortcut'
      toastData.sound = 4
      serverAPI.toaster.toast(toastData)
    }
  }

  return (
    <PanelSection>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onClick}
        >
          Add a Shortcut
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  )
}

export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>Add to Steam</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <MdSwitchAccessShortcutAdd />,
    onDismount() {
    },
  }
})
