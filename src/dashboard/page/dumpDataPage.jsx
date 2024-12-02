import { createContext, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { platform } from "@tauri-apps/plugin-os"
import moment from "moment"

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

import { getLevelInfos } from "../../lib/jsx-utils"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/scorllableTable"

const DumpDataPage = ({ node }) => {
  const { toast } = useToast()
  const [exportOption, setExportOption] = useState("dumapAll")
  const [formatOption, setFormatOption] = useState("sql")
  const [tableData, setTableData] = useState([])
  const [columnData, setColumnData] = useState([[]])
  const [showColumnIndex, setShowColumnIndex] = useState(0)
  const [filePath, setFilePath] = useState("")
  const [showTaskStatusDialog, setShowTaskStatusDialog] = useState(false)
  const [progress, setProgress] = useState(44)

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
      const tableData = response_msg.list.map((item, index) => {
        return {
          name: item.table_name,
          checked: true,
        }
      })
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

  const handleColumnCheckboxOnChange = (showColumnIndex, index, val) => {
    setColumnData((prevColumnData) => {
      const updatedColumnData = [...prevColumnData]
      updatedColumnData[showColumnIndex] = [
        ...updatedColumnData[showColumnIndex],
      ]
      updatedColumnData[showColumnIndex][index] = {
        ...updatedColumnData[showColumnIndex][index],
        checked: val,
      }
      return updatedColumnData
    })
  }
  const handleTableCheckboxOnChange = (index, val) => {
    setTableData((prevTableData) => {
      const updatedTableData = [...prevTableData]
      updatedTableData[index] = {
        ...updatedTableData[index],
        checked: val,
      }
      return updatedTableData
    })
    setColumnData((prevColumnData) => {
      const updatedColumnData = [...prevColumnData]
      updatedColumnData[index] = updatedColumnData[index].map((item) => ({
        ...item,
        checked: val,
      }))
      return updatedColumnData
    })
    setShowColumnIndex(index)
  }
  const handleTableOnClick = (index) => {
    setShowColumnIndex(index)
  }
  const handleSelectPathClick = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (Array.isArray(selected)) {
      return
    } else if (selected === null) {
      return
    } else {
    }
    const currentDateTime = moment().format("YYYY-MM-DD-HH-mm-ss")
    const endFix = formatOption.toLowerCase()
    const currentPlatform = platform()
    var path
    if (currentPlatform === "windows") {
      path = `${selected}\\${currentDateTime}.${endFix}`
    } else {
      path = `${selected}/${currentDateTime}.${endFix}`
    }
    setFilePath(path)
  }
  const handleStartExportOnClick = async () => {
    if (filePath === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file path.",
      })
      return
    }
    setShowTaskStatusDialog(true)
    const listNodeInfoReq = {
      level_infos: getLevelInfos(node),
    }
    const dumpDatabaseReq = {
      tables: tableData,
      columns: columnData,
      export_type: formatOption,
      export_option: exportOption,
      file_path: filePath,
    }
    const { response_code, response_msg } = JSON.parse(
      await invoke("dump_database", {
        listNodeInfoReq: listNodeInfoReq,
        dumpDatabaseReq: dumpDatabaseReq,
      })
    )
    console.log(response_code, response_msg)
  }
  const handleFormatOptionOnChange = (val) => {
    setFormatOption(val)
    if (filePath.endsWith("." + val)) {
      return
    }
    let newFilePath = filePath
    if (
      newFilePath.endsWith(".sql") ||
      newFilePath.endsWith(".csv") ||
      newFilePath.endsWith(".xml")
    ) {
      newFilePath = newFilePath.slice(0, -4) + "." + val
    } else if (filePath.endsWith(".json") || filePath.endsWith(".xlsx")) {
      newFilePath = newFilePath.slice(0, -5) + "." + val
    } else {
      newFilePath = newFilePath + "." + val
    }
    setFilePath(newFilePath)
  }
  return (
    <div className="flex h-full w-full flex-col  gap-2 bg-muted p-4">
      <Dialog
        open={showTaskStatusDialog}
        onOpenChange={setShowTaskStatusDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Running Status</DialogTitle>
            <DialogDescription className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2">
                <Progress
                  value={progress}
                  className="h-1 w-full bg-primary/50"
                />
                <span>{progress}%</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <div className="flex flex-row items-center justify-center gap-2">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </div>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-h-1/2 flex w-full flex-row  rounded-md border bg-background">
        <div className="flex basis-1/4 flex-col">
          <div className="relative overflow-auto">
            <Table className="w-full border">
              <TableHeader className="sticky top-0">
                <TableRow>
                  <TableHead>Table Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((item, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell
                        className={`flex  cursor-pointer flex-row gap-2  p-1 ${
                          index === showColumnIndex
                            ? "bg-accent text-accent-foreground"
                            : ""
                        }`}
                        onClick={() => handleTableOnClick(index)}
                      >
                        <Checkbox
                          id="terms"
                          checked={item.checked}
                          onCheckedChange={(val) =>
                            handleTableCheckboxOnChange(index, val)
                          }
                        />
                        <div className="text-xs">{item.name}</div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex basis-3/4 flex-col">
          <div className="relative h-60 overflow-auto">
            <Table className="w-full border">
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Column Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columnData.length > 0 &&
                  columnData[showColumnIndex].map((item, index) => {
                    return (
                      <TableRow key={index}>
                        <TableCell className="flex  flex-row gap-2 p-1">
                          <Checkbox
                            id="terms"
                            checked={item.checked}
                            onCheckedChange={(val) =>
                              handleColumnCheckboxOnChange(
                                showColumnIndex,
                                index,
                                val
                              )
                            }
                          />
                          <div className="text-xs">{item.column_name}</div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <Card className="bg-background">
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
                    onValueChange={(value) => handleFormatOptionOnChange(value)}
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
                        <SelectItem value="xlsx">Excel</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4">Export To Self-containered File:</div>
            <Input
              className="w-80 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
            />
            <Button
              className="text-xs"
              size="sm"
              onClick={handleSelectPathClick}
            >
              ...
            </Button>
          </div>
          <div className="medium flex w-full flex-row items-center justify-start gap-2 text-right">
            <div className="basis-1/4"></div>
            <Button
              className="text-xs"
              size="sm"
              onClick={() => handleStartExportOnClick()}
            >
              Start Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DumpDataPage
