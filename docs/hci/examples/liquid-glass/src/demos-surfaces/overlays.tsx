import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ui-sdk/react/alert-dialog";
import { Button } from "@ui-sdk/react/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ui-sdk/react/command";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@ui-sdk/react/drawer";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@ui-sdk/react/hover-card";
import { Input } from "@ui-sdk/react/input";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@ui-sdk/react/menu";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover";
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  createToaster,
} from "@ui-sdk/react/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui-sdk/react/tooltip";
import {
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuEmpty,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  TriggerMenuStatus,
  type TriggerMenuDataItem,
} from "@ui-sdk/react/trigger-menu";

export function ButtonDemo() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <Button data-variant="solid" onClick={() => setSaved(!saved)}>
          {saved ? <Check aria-hidden /> : <Plus aria-hidden />}
          {saved ? "Added" : "Add to collection"}
        </Button>
        <Button disabled>Unavailable</Button>
      </div>
      <output className="demo-muted" aria-live="polite">
        {saved
          ? "Saved to your local collection."
          : "Choose the primary action."}
      </output>
    </div>
  );
}

export function AlertDialogDemo() {
  const [cleared, setCleared] = useState(false);
  return (
    <div className="demo-stack">
      <AlertDialog>
        <AlertDialogTrigger>Reset this specimen</AlertDialogTrigger>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <div data-slot="stack">
            <AlertDialogTitle>Reset the specimen?</AlertDialogTitle>
            <AlertDialogDescription>
              This changes only the demonstration state in this card.
            </AlertDialogDescription>
          </div>
          <div data-slot="row">
            <AlertDialogClose>Keep it</AlertDialogClose>
            <AlertDialogClose
              data-variant="solid"
              value="confirm"
              data-agent-confirm="Resets this specimen's demonstration state."
              onClick={() => setCleared(true)}
            >
              Reset specimen
            </AlertDialogClose>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <output className="demo-muted" aria-live="polite">
        {cleared
          ? "The specimen has been reset."
          : "A clear choice before a state change."}
      </output>
    </div>
  );
}

export function CommandDemo() {
  const [action, setAction] = useState("Use ↑ ↓ and Enter to choose.");
  return (
    <div className="demo-stack">
      <Command onAction={(value) => setAction(`Selected ${value}.`)}>
        <CommandInput
          aria-label="Search specimen commands"
          placeholder="Find an action…"
        />
        <CommandEmpty>No matching actions.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <CommandGroupLabel>Workspace</CommandGroupLabel>
            <CommandItem value="New canvas">
              <Plus aria-hidden /> New canvas
            </CommandItem>
            <CommandItem value="Material settings">
              <SlidersHorizontal aria-hidden /> Material settings
            </CommandItem>
            <CommandItem value="Saved collection">
              <Bookmark aria-hidden /> Saved collection
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <output className="demo-muted" aria-live="polite">
        {action}
      </output>
    </div>
  );
}

export function DialogDemo() {
  const [name, setName] = useState("Morning light");
  const [saved, setSaved] = useState("");
  return (
    <div className="demo-stack">
      <Dialog>
        <DialogTrigger>
          <Sparkles aria-hidden /> Save a preset
        </DialogTrigger>
        <DialogBackdrop />
        <DialogContent>
          <div data-slot="stack">
            <DialogTitle>Save your material</DialogTitle>
            <DialogDescription>
              Name a preset for this demonstration.
            </DialogDescription>
          </div>
          <Field>
            <FieldLabel>Preset name</FieldLabel>
            <Input value={name} onValueChange={setName} />
          </Field>
          <div data-slot="row">
            <DialogClose>Cancel</DialogClose>
            <DialogClose
              data-variant="solid"
              disabled={!name.trim()}
              onClick={() => setSaved(name.trim())}
            >
              Save preset
            </DialogClose>
          </div>
          <DialogClose aria-label="Close preset dialog">
            <X aria-hidden />
          </DialogClose>
        </DialogContent>
      </Dialog>
      <output className="demo-muted" aria-live="polite">
        {saved
          ? `Saved “${saved}” in this specimen.`
          : "Focus stays in the dialog until it closes."}
      </output>
    </div>
  );
}

export function DrawerDemo() {
  const [columns, setColumns] = useState(3);
  return (
    <div className="demo-stack">
      <Drawer>
        <DrawerTrigger>
          <SlidersHorizontal aria-hidden /> Arrange workspace
        </DrawerTrigger>
        <DrawerBackdrop />
        <DrawerContent>
          <div data-slot="grip" aria-hidden />
          <div data-slot="stack">
            <DrawerTitle>Workspace layout</DrawerTitle>
            <DrawerDescription>Choose a preview density.</DrawerDescription>
          </div>
          <div className="demo-row">
            <Button
              aria-label="Fewer preview columns"
              disabled={columns <= 1}
              onClick={() => setColumns((value) => value - 1)}
            >
              −
            </Button>
            <output className="demo-value" aria-live="polite">
              {columns} columns
            </output>
            <Button
              aria-label="More preview columns"
              disabled={columns >= 4}
              onClick={() => setColumns((value) => value + 1)}
            >
              +
            </Button>
          </div>
          <div
            className="surface-layout-preview"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            aria-hidden
          >
            {Array.from({ length: columns * 2 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <DrawerClose data-variant="solid">Done</DrawerClose>
        </DrawerContent>
      </Drawer>
      <span className="demo-muted">Drag down or press Escape to close.</span>
    </div>
  );
}

export function HoverCardDemo() {
  return (
    <HoverCard>
      <HoverCardTrigger
        href="#component-avatar"
        className="surface-profile-trigger"
      >
        <span className="surface-initials" aria-hidden>
          Q
        </span>
        <span>Quantitative HCI</span>
        <ArrowUpRight aria-hidden />
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="demo-stack">
          <strong>Quantitative HCI</strong>
          <p>Reusable interfaces, explicit states and measured interaction.</p>
          <span className="demo-muted">Internal component collection</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function MenuDemo() {
  const [action, setAction] = useState("No action selected.");
  return (
    <div className="demo-stack">
      <Menu onAction={(value) => setAction(`${value} selected.`)}>
        <MenuTrigger>
          Collection actions <ChevronDown aria-hidden />
        </MenuTrigger>
        <MenuContent>
          <MenuGroup>
            <MenuGroupLabel>Local specimen</MenuGroupLabel>
            <MenuItem value="Duplicate">Duplicate</MenuItem>
            <MenuItem value="Rename">Rename</MenuItem>
            <MenuItem value="Archive">Archive</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem value="Locked action" disabled>
            Locked action
          </MenuItem>
        </MenuContent>
      </Menu>
      <output className="demo-muted" aria-live="polite">
        {action}
      </output>
    </div>
  );
}

export function PopoverDemo() {
  const [light, setLight] = useState("Balanced");
  return (
    <div className="demo-stack">
      <Popover>
        <PopoverTrigger>
          <SlidersHorizontal aria-hidden /> Quick settings
        </PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Lighting</PopoverTitle>
          <PopoverDescription>
            Choose a look for this specimen.
          </PopoverDescription>
          <div className="demo-row">
            {["Cool", "Balanced", "Warm"].map((value) => (
              <Button
                key={value}
                aria-pressed={light === value}
                onClick={() => setLight(value)}
              >
                {value}
              </Button>
            ))}
          </div>
          <PopoverClose>Done</PopoverClose>
        </PopoverContent>
      </Popover>
      <output className="demo-muted" aria-live="polite">
        {light} light selected.
      </output>
    </div>
  );
}

export function ToastDemo() {
  const [toaster] = useState(() => createToaster());
  const [saved, setSaved] = useState(false);
  useEffect(() => () => toaster.dismiss(), [toaster]);
  return (
    <div className="demo-stack">
      <Button
        onClick={() => {
          setSaved(true);
          toaster("Preset saved", {
            description: "Saved in this demonstration.",
            action: { label: "Undo", onAction: () => setSaved(false) },
          });
        }}
      >
        <Check aria-hidden /> Save and notify
      </Button>
      <output className="demo-muted" aria-live="polite">
        {saved
          ? "Preset saved. Undo is available in the notification."
          : "No pending changes."}
      </output>
      <ToastRegion toaster={toaster}>
        {() => (
          <Toast>
            <div data-slot="stack">
              <ToastTitle />
              <ToastDescription />
            </div>
            <ToastAction />
          </Toast>
        )}
      </ToastRegion>
    </div>
  );
}

export function TooltipDemo() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="demo-stack">
      <Tooltip>
        <TooltipTrigger
          aria-label={saved ? "Remove specimen bookmark" : "Bookmark specimen"}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
        >
          <Bookmark aria-hidden fill={saved ? "currentColor" : "none"} />
        </TooltipTrigger>
        <TooltipContent>
          {saved ? "Remove bookmark" : "Keep this specimen"}
        </TooltipContent>
      </Tooltip>
      <output className="demo-muted">
        {saved ? "Bookmarked." : "Hover or focus for a label."}
      </output>
    </div>
  );
}

const mentionItems = [
  { value: "materials", label: "Materials team" },
  { value: "interaction", label: "Interaction team" },
  { value: "research", label: "Research team" },
];
export function TriggerMenuDemo() {
  return (
    <TriggerMenu
      triggers={[{ char: "@", type: "mention", items: mentionItems }]}
    >
      <div className="demo-stack">
        <label className="demo-muted">
          Draft note
          <TriggerMenuInput
            aria-label="Draft note with mentions"
            placeholder="Type @ to mention a team…"
          />
        </label>
        <div data-slot="visually-hidden">
          <TriggerMenuStatus />
        </div>
      </div>
      <TriggerMenuContent>
        <TriggerMenuEmpty>No matching teams.</TriggerMenuEmpty>
        <TriggerMenuList>
          {(state) =>
            (state.items as TriggerMenuDataItem[]).map((item) => (
              <TriggerMenuItem
                key={item.value}
                value={item.value}
                label={item.label}
              >
                {item.label}
              </TriggerMenuItem>
            ))
          }
        </TriggerMenuList>
      </TriggerMenuContent>
    </TriggerMenu>
  );
}
