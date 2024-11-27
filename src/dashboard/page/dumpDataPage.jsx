import { createContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos } from "../../lib/jsx-utils"

const DumpDataPage = ({ node }) => {
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }

    const { response_code, response_msg } = JSON.parse(
      await invoke("init_dump_data", { listNodeInfoReq })
    )

    console.log(response_code, response_msg)
    if (response_code === 0) {
      response_msg.list.map((item) => {})
    } else {
      toast({
        variant: "destructive",
        title: "Load Data Error",
        description: response_msg,
      })
    }
  }
  return <div>dumpDataPage</div>
}

export default DumpDataPage
