import { useState } from "react";
import {
  Bold,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  File,
  Folder,
  Italic,
  Link,
  Underline,
} from "lucide-react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@ui-sdk/react/accordion";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@ui-sdk/react/collapsible";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuItemIndicator,
  MenuSeparator,
  MenuTrigger,
} from "@ui-sdk/react/menu";
import { Menubar } from "@ui-sdk/react/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@ui-sdk/react/navigation-menu";
import {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@ui-sdk/react/pagination";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@ui-sdk/react/tabs";
import { Toggle, ToggleIcon } from "@ui-sdk/react/toggle";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "@ui-sdk/react/toolbar";
import {
  Tree,
  TreeGroup,
  TreeItem,
  TreeItemIndicator,
  TreeItemLabel,
} from "@ui-sdk/react/tree";

export function MenubarDemo() {
  const [last, setLast] = useState("Use arrow keys between menus.");
  return (
    <div className="demo-stack">
      <Menubar aria-label="Specimen document menus">
        <Menu onAction={(value) => setLast(`${value} selected.`)}>
          <MenuTrigger>File</MenuTrigger>
          <MenuContent>
            <MenuItem value="New document">New document</MenuItem>
            <MenuItem value="Duplicate document">Duplicate</MenuItem>
            <MenuSeparator aria-label="File action groups" />
            <MenuItem value="Export specimen">Export specimen</MenuItem>
          </MenuContent>
        </Menu>
        <Menu onAction={(value) => setLast(`${value} selected.`)}>
          <MenuTrigger>Edit</MenuTrigger>
          <MenuContent>
            <MenuItem value="Undo" disabled>
              Undo
            </MenuItem>
            <MenuItem value="Select all">Select all</MenuItem>
          </MenuContent>
        </Menu>
        <Menu
          onCheckedChange={(value) =>
            setLast(value ? "Grid enabled." : "Grid disabled.")
          }
        >
          <MenuTrigger>View</MenuTrigger>
          <MenuContent>
            <MenuCheckboxItem value="grid" defaultChecked>
              <MenuItemIndicator />
              Show grid
            </MenuCheckboxItem>
          </MenuContent>
        </Menu>
      </Menubar>
      <output className="demo-muted" aria-live="polite">
        {last}
      </output>
    </div>
  );
}

export function NavigationMenuDemo() {
  return (
    <NavigationMenu aria-label="Library specimen navigation">
      <NavigationMenuList>
        <NavigationMenuItem value="components">
          <NavigationMenuTrigger>
            Explore <ChevronDown aria-hidden />
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul>
              <li>
                <NavigationMenuLink href="#component-button">
                  <strong>Button</strong>
                  <span data-slot="hint">Primary and secondary actions</span>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#component-input">
                  <strong>Input</strong>
                  <span data-slot="hint">Focused text entry</span>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#component-tabs">
                  <strong>Tabs</strong>
                  <span data-slot="hint">Switch related panels</span>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#component-preferences">
            Preferences
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuViewport sideOffset={8} />
    </NavigationMenu>
  );
}

export function PaginationDemo() {
  const [page, setPage] = useState(1);
  return (
    <div className="demo-stack">
      <Pagination
        aria-label="Specimen pages"
        pageCount={5}
        page={page}
        onPageChange={setPage}
      >
        <PaginationList>
          {({ items }) => (
            <>
              <PaginationItem>
                <PaginationPrevious aria-label="Previous specimen page">
                  <ChevronLeft aria-hidden />
                </PaginationPrevious>
              </PaginationItem>
              {items.map((item) => (
                <PaginationItem key={item}>
                  {typeof item === "number" ? (
                    <PaginationLink page={item} />
                  ) : (
                    <PaginationEllipsis>…</PaginationEllipsis>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext aria-label="Next specimen page">
                  <ChevronRight aria-hidden />
                </PaginationNext>
              </PaginationItem>
            </>
          )}
        </PaginationList>
      </Pagination>
      <output className="demo-muted" aria-live="polite">
        Page {page} of 5
      </output>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="design" aria-label="Specimen details">
      <TabsList aria-label="Specimen details">
        <TabsTab value="design">Design</TabsTab>
        <TabsTab value="build">Build</TabsTab>
        <TabsTab value="measure">Measure</TabsTab>
      </TabsList>
      <TabsPanel value="design">
        <strong>One material system.</strong>
        <p className="demo-muted">Shared colour, shape and light.</p>
      </TabsPanel>
      <TabsPanel value="build">
        <strong>Real component behaviour.</strong>
        <p className="demo-muted">
          Keyboard, focus and state come from UI SDK.
        </p>
      </TabsPanel>
      <TabsPanel value="measure">
        <strong>Check the interaction.</strong>
        <p className="demo-muted">
          Compare completion, errors and feedback time.
        </p>
      </TabsPanel>
    </Tabs>
  );
}

export function ToolbarDemo() {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [linked, setLinked] = useState(false);
  return (
    <div className="demo-stack">
      <Toolbar aria-label="Sample text formatting">
        <Toggle
          aria-label="Bold sample"
          pressed={bold}
          onPressedChange={setBold}
        >
          <ToggleIcon>
            <Bold />
          </ToggleIcon>
        </Toggle>
        <Toggle
          aria-label="Italic sample"
          pressed={italic}
          onPressedChange={setItalic}
        >
          <ToggleIcon>
            <Italic />
          </ToggleIcon>
        </Toggle>
        <Toggle
          aria-label="Underline sample"
          pressed={underline}
          onPressedChange={setUnderline}
        >
          <ToggleIcon>
            <Underline />
          </ToggleIcon>
        </Toggle>
        <ToolbarSeparator aria-hidden="true" />
        <ToolbarButton
          aria-label="Toggle sample link"
          aria-pressed={linked}
          onClick={() => setLinked((value) => !value)}
        >
          <Link aria-hidden />
        </ToolbarButton>
      </Toolbar>
      <p
        className="surface-type-preview"
        style={{
          fontWeight: bold ? 750 : 450,
          fontStyle: italic ? "italic" : "normal",
          textDecoration: underline || linked ? "underline" : "none",
        }}
      >
        {linked ? "A connected thought." : "A considered detail."}
      </p>
    </div>
  );
}

export function AccordionDemo() {
  return (
    <Accordion defaultValue={["material"]} aria-label="Material questions">
      {[
        {
          value: "material",
          title: "What changes with glass?",
          body: "The surface picks up its background. Labels and interaction remain stable.",
        },
        {
          value: "access",
          title: "What about accessibility?",
          body: "Keep visible focus, readable labels and solid fallbacks.",
        },
      ].map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionHeader>
            <AccordionTrigger>
              {item.title}
              <ChevronDown aria-hidden />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>{item.body}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function CollapsibleDemo() {
  return (
    <Collapsible data-variant="card">
      <CollapsibleTrigger>
        <span className="demo-stack">
          <strong>Material details</strong>
          <span className="demo-muted">3 shared tokens</span>
        </span>
        <ChevronDown aria-hidden />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <dl className="surface-token-list">
          <div>
            <dt>Surface</dt>
            <dd>Regular glass</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>Visible ring</dd>
          </div>
          <div>
            <dt>Fallback</dt>
            <dd>Solid</dd>
          </div>
        </dl>
      </CollapsiblePanel>
    </Collapsible>
  );
}

export function TreeDemo() {
  const [selected, setSelected] = useState<string | string[] | null>(
    "materials/regular",
  );
  return (
    <div className="demo-stack">
      <Tree
        aria-label="Specimen library files"
        defaultExpanded={["materials"]}
        defaultValue="materials/regular"
        onValueChange={setSelected}
      >
        <TreeItem value="materials">
          <TreeItemLabel>
            <TreeItemIndicator>
              <ChevronRight aria-hidden />
            </TreeItemIndicator>
            <Folder aria-hidden />
            <span>Materials</span>
          </TreeItemLabel>
          <TreeGroup>
            {["regular", "clear", "solid"].map((value) => (
              <TreeItem key={value} value={`materials/${value}`}>
                <TreeItemLabel>
                  <File aria-hidden />
                  <span>{value}.css</span>
                </TreeItemLabel>
              </TreeItem>
            ))}
          </TreeGroup>
        </TreeItem>
        <TreeItem value="tokens">
          <TreeItemLabel>
            <File aria-hidden />
            <span>tokens.css</span>
          </TreeItemLabel>
        </TreeItem>
      </Tree>
      <output className="demo-muted" aria-live="polite">
        {Array.isArray(selected)
          ? selected.join(", ")
          : selected || "No file selected"}
      </output>
    </div>
  );
}
