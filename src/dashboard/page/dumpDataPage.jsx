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
  const [exportOption, setExportOption] = useState("dumapAll")
  const [formatOption, setFormatOption] = useState("sql")
  const [tableData, setTableData] = useState([])
  const [columnData, setColumnData] = useState([[]])
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
      const tableData = response_msg.list.map((item, index) => item.table_name)
      setTableData(tableData)
      const columnData = response_msg.list.map((item) => {
        return item.columns.map((item2) => {
          return { ...item2, checked: true }
        })
      })
      console.log(columnData)
      setColumnData(columnData)
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
          <Table className="h-60 w-full  border">
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell className="flex flex-row gap-2">
                      <Checkbox id="terms" />
                      <div>{item}</div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex basis-1/2 flex-col">
          <Table className="h-60 w-full border">
            <TableHeader>
              <TableRow>
                <TableHead>Column Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="h-60">
              {columnData.length > 0 &&
                columnData[0].map((item, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell className="flex flex-row gap-2">
                        <Checkbox id="terms" checked={item.checked} />
                        <div>{item.column_name}</div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
            <Select
              value={exportOption}
              onValueChange={(value) => {
                console.log(value)
                setExportOption(value)
              }}
            >
              <SelectTrigger className="w-[200px] text-xs focus:ring-1 focus:ring-offset-0">
                <SelectValue />
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

            {exportOption == "dumpData" && (
              <>
                <div className="ml-4">File Format:</div>
                <div>
                  <Select
                    value={formatOption}
                    onValueChange={(value) => {
                      console.log(value)
                      setFormatOption(value)
                    }}
                  >
                    <SelectTrigger className="w-[180px] focus:ring-1 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="xml">XML</SelectItem>
                        <SelectItem value="json">JSON </SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4 		">Export To Self-containered File:</div>
            <Input className="w-80 focus-visible:ring-1 focus-visible:ring-offset-0" />
            <Button className="text-xs">...</Button>
          </div>
          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4"></div>
            <Button className="text-xs">Start Export</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DumpDataPage
