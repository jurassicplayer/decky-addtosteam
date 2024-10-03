import {
  ButtonItem,
  definePlugin,
  Navigation,
  PanelSection,
  PanelSectionRow,
  showModal,
  ConfirmModal,
  staticClasses,
  TextField,
  DropdownItem,
  SingleDropdownOption,
  
} from "@decky/ui"
import { call, FileSelectionType, openFilePicker, ToastData, toaster } from "@decky/api"
import { useEffect, useState } from "react"
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

const ShortcutOptionsModal = (props: {closeModal?: CallableFunction, appID: number, appName: string}) => {
  const { appID } = props
  let createShortcut = false
  const [shortcutName, setShortcutName] = useState<string>(props.appName)
  const [compatTools, setCompatTools] = useState<{data: string, label: string}[]>([])
  const [compatTool, setCompatTool] = useState<SingleDropdownOption>({data:'', label: 'None'})
  useEffect(() => {
    let getData = async () => {
      let appDetails = await getAppDetails(appID)
      let availableCompatTools:{strToolName: string, strDisplayName: string}[] = await SteamClient.Apps.GetAvailableCompatTools(appID)
      return {
        appDetails: appDetails,
        compatTools: availableCompatTools.map(
          ({strToolName, strDisplayName}) => { return {data: strToolName, label: strDisplayName} }
        )
      }
    }
    getData().then((data) => {
      data.compatTools.unshift({data:'', label: 'None'})
      setCompatTools(data.compatTools)
      if (data.appDetails) {
        let filepath = data.appDetails.strDisplayName.split('.')
        let fileext = filepath.pop()?.toLowerCase()
        if (fileext && ['exe', 'bat', 'ps1'].includes(fileext) && data.compatTools.length > 1) {
          setCompatTool(data.compatTools[1])
        }
      }
    })
  }, [])
  
  const closeModal = () => {
    if (!createShortcut) { SteamClient.Apps.RemoveShortcut(appID) }
    if (props.closeModal) { props.closeModal() }
  }
  const onCreateShortcut = async () => {
    createShortcut = true
    SteamClient.Apps.SetShortcutName(appID, shortcutName)
    SteamClient.Apps.SpecifyCompatTool(appID, compatTool.data)
    let toastData: ToastData = {
      title: 'Added Shortcut',
      body: shortcutName,
      playSound: true,
      showToast: true
    }
    toaster.toast(toastData)
  }
  return (
    <ConfirmModal
      strTitle='Shortcut Options'
      strOKButtonText='Create'
      closeModal={closeModal}
      onOK={onCreateShortcut}
      onCancel={closeModal}
      onEscKeypress={closeModal}>
        <TextField
          label='Title'
          focusOnMount={true}
          value={shortcutName}
          onChange={(e) => setShortcutName(e.currentTarget.value)} />
        <DropdownItem
          label='Compatibility Tool'
          rgOptions={compatTools}
          selectedOption={compatTool.data}
          onChange={(e) => setCompatTool(e)}/>
    </ConfirmModal>
  )
}

const Content = () => {
  const [lastUsedPath, setLastUsedPath] = useState<string>('')
  useEffect(()=>{
    onInit()
  },[])
  const onInit = async () => {
    let lastUsedPath = localStorage.getItem('decky-addtosteam')
    let deckyUserHome = (await call<any, string>('getDeckyUserHome'))
    let path = lastUsedPath || deckyUserHome
    setLastUsedPath(path)
  }
  const onClick = async () => {
    Navigation.CloseSideMenus()
    let filepath = await openFilePicker(
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
    const file:string = filepath.realpath.split(/[\\\/]/).pop()
    let filename = file
    if (file) {
      let newfilename = file.split('.')
      newfilename.pop()
      filename = newfilename.join('.')
    }
    
    let path = filepath.realpath.substring(0, filepath.realpath.length - (file ? file.length : 0))
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
    if (shortcutAdded.success) {
      showModal(<ShortcutOptionsModal appID={shortcutAdded.success} appName={appName} />)
    } else {
      let toastData: ToastData = {
        title: 'Failed to add Shortcut',
        body: file,
        sound: 4,
        playSound: true,
        showToast: true
      }
      toaster.toast(toastData)
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

export default definePlugin(() => {
  return {
    title: <div className={staticClasses.Title}>Add to Steam</div>,
    content: <Content />,
    icon: <MdSwitchAccessShortcutAdd />,
    onDismount() {
    },
  }
})
