import * as Tabs from "@radix-ui/react-tabs";
import DataPage from "./dataPage";

export default function TablePage({ tableName }) {

    return (
        <Tabs.Root defaultValue="data" className="h-full w-full"
        >
            <Tabs.List className="inline-flex h-10 items-center justify-center rounded-md  p-1 text-muted-foreground">
                <Tabs.Trigger value="properties" className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-muted">
                    <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-pencil"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></svg>
                        <p>Properties</p>
                    </div>
                </Tabs.Trigger>
                <Tabs.Trigger value="data" className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-muted">
                    <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-database stroke-blue-500"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 6m-8 0a8 3 0 1 0 16 0a8 3 0 1 0 -16 0" /><path d="M4 6v6a8 3 0 0 0 16 0v-6" /><path d="M4 12v6a8 3 0 0 0 16 0v-6" /></svg>
                        <p>Data</p>
                    </div>
                </Tabs.Trigger>
                <Tabs.Trigger value="diagram" className="inline-flex items-center justify-center whitespace-nowrap  px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-muted ">
                    <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chart-dots-3 stroke-amber-500"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M16 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M9 17l5 -1.5" /><path d="M6.5 8.5l7.81 5.37" /><path d="M7 7l8 -1" /></svg>
                        <p>Diagram</p>
                    </div>

                </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="properties" className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                <p>sss1</p>
            </Tabs.Content>

            <Tabs.Content value="data" className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <DataPage />
            </Tabs.Content>

            <Tabs.Content value="diagram" className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <p>sss3</p>
            </Tabs.Content>
        </Tabs.Root >

    )
}