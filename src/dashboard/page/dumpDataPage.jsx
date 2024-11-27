import { createContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/hooks/use-toast"

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
  return (
    <div className="flex h-full w-full flex-col  gap-2 p-4">
      <div className="max-h-1/2 flex w-full flex-row">
        <div className="flex basis-1/2 flex-col">
          <Table className="h-full w-full border">
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow key={1}>
                <TableCell className="flex flex-row gap-2">
                  <Checkbox id="terms" />
                  <div>2</div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="flex basis-1/2 flex-col">
          <Table className="h-full w-full border">
            <TableHeader>
              <TableRow>
                <TableHead>Column Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow key={1}>
                <TableCell className="flex flex-row gap-2">
                  <Checkbox id="terms" />
                  <div>2</div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-row items-center justify-start">
        <div>Objects To Export:</div>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="blueberry">Blueberry</SelectItem>
              <SelectItem value="grapes">Grapes</SelectItem>
              <SelectItem value="pineapple">Pineapple</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button variant="outline">Button</Button>
      </div>
    </div>
  )
}

export default DumpDataPage
