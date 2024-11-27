import { createContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
  return (
    <div className="flex h-full w-full flex-col  gap-2 p-4">
      <div className="max-h-1/2 flex w-full flex-row">
        <div className="flex basis-1/2 flex-col">
          <Table className="h-full w-full  border">
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
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent className=" flex flex-col gap-2">
          <div className="flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4">Objects To Export:</div>
            <Select>
              <SelectTrigger className="w-[180px] focus:ring-1 focus:ring-offset-0">
                <SelectValue placeholder="Select a fruit" value="dumapAll" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="dumapAll">
                    Dump Structure and Data
                  </SelectItem>
                  <SelectItem value="dumpData">Dump Data Only</SelectItem>
                  <SelectItem value="dumpStructure">
                    Dump Structure Only
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4">Export To Self-containered File:</div>
            <Input className="w-80 focus-visible:ring-1 focus-visible:ring-offset-0" />
            <Button>.....</Button>
          </div>
          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4">Print [Start Export] to start...</div>
            <Button>Start Export</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DumpDataPage
