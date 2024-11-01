import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"

import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

import { Button } from "../../components/ui/button"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export function PreferenceDialog() {
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const handleResetButtonOnClick = async () => {
    const { response_code, response_msg } = JSON.parse(
      await invoke("reset_menu_index")
    )
    console.log(response_code)
    console.log(response_msg)
    if (response_code === 0) {
      toast({
        title: "操作信息",
        description: "菜单项已经重置成功。",
      })
      await delay(2000)
      window.location.reload()
    }
  }
  return (
    <DialogContent className="overflow-clip">
      <DialogHeader className="flex items-center text-center">
        <DialogTitle className="flex flex-col items-center">
          Setting
        </DialogTitle>
        <Separator />

        <Button onClick={handleResetButtonOnClick}>
          {" "}
          {t("preferenceDialog.resetMenuIndexButtonText")}
        </Button>
      </DialogHeader>
    </DialogContent>
  )
}
