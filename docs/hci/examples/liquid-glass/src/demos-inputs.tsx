import { useId, useState, type ComponentType } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  File,
  Upload,
  X,
  Minus,
  Plus,
  Eye,
  EyeOff,
  Star,
  Bookmark,
} from "lucide-react";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteLabel,
  AutocompleteList,
} from "@ui-sdk/react/autocomplete";
import { Button } from "@ui-sdk/react/button";
import {
  Calendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "@ui-sdk/react/calendar";
import {
  Checkbox,
  CheckboxIndicator,
} from "@ui-sdk/react/checkbox";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerAreaThumb,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
  ColorPickerSwatch,
  ColorPickerSwatches,
  ColorPickerSwatchItem,
} from "@ui-sdk/react/color-picker";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox";
import { DateInput } from "@ui-sdk/react/date-input";
import {
  DatePicker,
  DatePickerContent,
  DatePickerHint,
  DatePickerInput,
  DatePickerTrigger,
} from "@ui-sdk/react/date-picker";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ui-sdk/react/field";
import {
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  formatFileSize,
} from "@ui-sdk/react/file-input";
import {
  Input,
  InputClear,
  InputGroup,
} from "@ui-sdk/react/input";
import { Label } from "@ui-sdk/react/label";
import {
  Listbox,
  ListboxItem,
  ListboxItemIndicator,
} from "@ui-sdk/react/listbox";
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input";
import {
  OTPInput,
  OTPInputGroup,
  OTPInputSeparator,
  OTPInputSlot,
} from "@ui-sdk/react/otp-input";
import {
  PasswordInput,
  PasswordInputControl,
  PasswordInputToggle,
} from "@ui-sdk/react/password-input";
import {
  Radio,
  RadioGroup,
  RadioIndicator,
} from "@ui-sdk/react/radio";
import { Rating, RatingItem } from "@ui-sdk/react/rating";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Textarea } from "@ui-sdk/react/textarea";
import { TimeInput } from "@ui-sdk/react/time-input";
import { Toggle, ToggleIcon } from "@ui-sdk/react/toggle";
import {
  TokenInput,
  TokenInputEditor,
  TokenInputToken,
  TokenInputTokenRemove,
  type TokenInputValue,
} from "@ui-sdk/react/token-input";
import {
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuItem,
  TriggerMenuList,
  type TriggerMenuDataItem,
} from "@ui-sdk/react/trigger-menu";

const destinations = [
  "Newcastle",
  "Lake Macquarie",
  "Sydney",
  "Port Stephens",
  "Hunter Valley",
  "Blue Mountains",
];
const materials = [
  { value: "regular", label: "Regular glass" },
  { value: "clear", label: "Clear glass" },
  { value: "frosted", label: "Frosted glass" },
  { value: "solid", label: "Solid surface" },
];

function AutocompleteDemo() {
  return (
    <Autocomplete>
      <div className="demo-stack">
        <AutocompleteLabel>Find a destination</AutocompleteLabel>
        <AutocompleteInput placeholder="Try Newcastle" />
      </div>
      <AutocompleteContent>
        <AutocompleteEmpty>No matching destinations.</AutocompleteEmpty>
        <AutocompleteList>
          {destinations.map((destination) => (
            <AutocompleteItem key={destination} value={destination}>
              {destination}
            </AutocompleteItem>
          ))}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}

function CheckboxDemo() {
  return (
    <div className="demo-stack">
      <Label>
        <Checkbox defaultChecked>
          <CheckboxIndicator>
            <Check aria-hidden="true" />
          </CheckboxIndicator>
        </Checkbox>
        Keyboard navigation
      </Label>
      <Label>
        <Checkbox>
          <CheckboxIndicator>
            <Check aria-hidden="true" />
          </CheckboxIndicator>
        </Checkbox>
        Touch interactions
      </Label>
      <Label>
        <Checkbox disabled defaultChecked>
          <CheckboxIndicator>
            <Check aria-hidden="true" />
          </CheckboxIndicator>
        </Checkbox>
        Screen reader labels
      </Label>
    </div>
  );
}

function ColorPickerDemo() {
  return (
    <ColorPicker aria-label="Accent colour" defaultValue="#62c5e8" format="hex">
      <ColorPickerArea>
        <ColorPickerAreaThumb />
      </ColorPickerArea>
      <ColorPickerSlider channel="hue">
        <ColorPickerSliderThumb />
      </ColorPickerSlider>
      <div className="demo-row">
        <ColorPickerSwatch />
        <ColorPickerInput aria-label="Accent colour value" />
      </div>
      <ColorPickerSwatches aria-label="Accent presets">
        {["#62c5e8", "#a89bfa", "#9cddaf", "#f0bd93", "#ef9bb6"].map(
          (value) => (
            <ColorPickerSwatchItem key={value} value={value} />
          ),
        )}
      </ColorPickerSwatches>
    </ColorPicker>
  );
}

function ComboboxDemo() {
  return (
    <Combobox defaultValue="regular">
      <div className="demo-stack">
        <ComboboxLabel>Search materials</ComboboxLabel>
        <div className="demo-row">
          <ComboboxInput placeholder="Choose a material" />
          <ComboboxTrigger aria-label="Show materials">
            <ChevronDown aria-hidden="true" />
          </ComboboxTrigger>
        </div>
      </div>
      <ComboboxContent>
        <ComboboxEmpty>No matching materials.</ComboboxEmpty>
        <ComboboxList>
          {materials.map(({ value, label }) => (
            <ComboboxItem key={value} value={value} label={label}>
              {label}
              <ComboboxItemIndicator>
                <Check aria-hidden="true" />
              </ComboboxItemIndicator>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function DateInputDemo() {
  return (
    <Field>
      <FieldLabel>Review date</FieldLabel>
      <DateInput defaultValue="2026-11-24" locale="en-AU" />
      <FieldDescription>Type a date or use the arrow keys.</FieldDescription>
    </Field>
  );
}

function CalendarBody() {
  return (
    <>
      <div className="demo-row">
        <CalendarPrevious aria-label="Previous month">
          <ChevronLeft aria-hidden="true" />
        </CalendarPrevious>
        <CalendarHeading />
        <CalendarNext aria-label="Next month">
          <ChevronRight aria-hidden="true" />
        </CalendarNext>
      </div>
      <CalendarGrid>
        <CalendarWeekdays>
          {(index) => <CalendarWeekday index={index} />}
        </CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => <CalendarDay value={cell.date} />}
        </CalendarWeeks>
      </CalendarGrid>
    </>
  );
}

function DatePickerDemo() {
  return (
    <DatePicker defaultValue="2026-11-24" locale="en-AU">
      <div className="demo-row">
        <DatePickerInput aria-label="Choose a review date" />
        <DatePickerTrigger aria-label="Open review calendar">
          <CalendarDays aria-hidden="true" />
        </DatePickerTrigger>
      </div>
      <DatePickerHint />
      <DatePickerContent>
        <CalendarBody />
      </DatePickerContent>
    </DatePicker>
  );
}

function FieldDemo() {
  const [message, setMessage] = useState("");
  return (
    <form
      className="demo-stack"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("Email format is valid. Nothing was sent.");
      }}
    >
      <Field name="preview-email">
        <FieldLabel>Email address</FieldLabel>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          onValueChange={() => setMessage("")}
        />
        <FieldDescription>
          Try an empty field or an incomplete address.
        </FieldDescription>
        <FieldError match="valueMissing">Enter an email address.</FieldError>
        <FieldError match="typeMismatch">
          Use an address such as you@example.com.
        </FieldError>
      </Field>
      <Button type="submit">Check address</Button>
      {message && (
        <p className="demo-value" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function FileInputDemo() {
  return (
    <FileInput multiple aria-label="Local sample files">
      <FileInputDropzone>
        <Upload aria-hidden="true" />
        <p>Drop a file here</p>
        <FileInputTrigger>Choose files</FileInputTrigger>
        <p className="demo-muted">Local preview only.</p>
      </FileInputDropzone>
      <FileInputList aria-label="Selected files">
        <FileInputItem>
          {({ file }) => (
            <>
              <File aria-hidden="true" />
              <span>{file.name}</span>
              <span className="demo-muted">{formatFileSize(file.size)}</span>
              <FileInputItemRemove aria-label={`Remove ${file.name}`}>
                <X aria-hidden="true" />
              </FileInputItemRemove>
            </>
          )}
        </FileInputItem>
      </FileInputList>
    </FileInput>
  );
}

function InputDemo() {
  return (
    <div className="demo-stack">
      <Field>
        <FieldLabel>Project name</FieldLabel>
        <InputGroup>
          <Input defaultValue="Coastal studio" />
          <InputClear aria-label="Clear project name">
            <X aria-hidden="true" />
          </InputClear>
        </InputGroup>
      </Field>
      <Field disabled>
        <FieldLabel>Workspace</FieldLabel>
        <Input value="Quantive HCI" readOnly />
      </Field>
    </div>
  );
}

function LabelDemo() {
  const id = useId();
  return (
    <div className="demo-stack">
      <Label htmlFor={id}>Click this label to focus the name</Label>
      <Input id={id} defaultValue="Glass collection" />
      <p className="demo-muted">
        The label and input share one accessible name.
      </p>
    </div>
  );
}

function ListboxDemo() {
  return (
    <Field>
      <FieldLabel>Preview backgrounds</FieldLabel>
      <Listbox multiple activation="automatic" defaultValue={["coast"]}>
        {["Coast", "Aurora", "Studio"].map((label) => (
          <ListboxItem key={label} value={label.toLowerCase()}>
            {label}
            <ListboxItemIndicator>
              <Check aria-hidden="true" />
            </ListboxItemIndicator>
          </ListboxItem>
        ))}
      </Listbox>
      <FieldDescription>
        Use Shift for a range, or ⌘ / Ctrl to add a selection.
      </FieldDescription>
    </Field>
  );
}

function NumberInputDemo() {
  return (
    <Field>
      <FieldLabel>Corner radius</FieldLabel>
      <NumberInput defaultValue={24} min={0} max={48} step={2}>
        <NumberInputGroup>
          <NumberInputDecrement aria-label="Decrease corner radius">
            <Minus aria-hidden="true" />
          </NumberInputDecrement>
          <NumberInputControl />
          <NumberInputIncrement aria-label="Increase corner radius">
            <Plus aria-hidden="true" />
          </NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
      <FieldDescription>0–48 px, in steps of 2.</FieldDescription>
    </Field>
  );
}

function OTPInputDemo() {
  const [complete, setComplete] = useState(false);
  return (
    <Field>
      <FieldLabel>Six-digit preview code</FieldLabel>
      <OTPInput
        maxLength={6}
        onValueChange={(value) => setComplete(value.length === 6)}
      >
        <OTPInputGroup>
          {[0, 1, 2].map((index) => (
            <OTPInputSlot key={index} index={index} />
          ))}
        </OTPInputGroup>
        <OTPInputSeparator>
          <Minus aria-hidden="true" />
        </OTPInputSeparator>
        <OTPInputGroup>
          {[3, 4, 5].map((index) => (
            <OTPInputSlot key={index} index={index} />
          ))}
        </OTPInputGroup>
      </OTPInput>
      <FieldDescription>
        {complete ? "All six digits entered." : "Type or paste any six digits."}
      </FieldDescription>
    </Field>
  );
}

function PasswordInputDemo() {
  return (
    <Field>
      <FieldLabel>Sample password</FieldLabel>
      <PasswordInput defaultValue="coastal-glass" autoComplete="off">
        <PasswordInputControl />
        <PasswordInputToggle aria-label="Toggle password visibility">
          {(state) =>
            state.visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )
          }
        </PasswordInputToggle>
      </PasswordInput>
      <FieldDescription>
        Use the eye to reveal or hide the sample.
      </FieldDescription>
    </Field>
  );
}

function RadioDemo() {
  return (
    <Field>
      <FieldLabel>Rendering preference</FieldLabel>
      <RadioGroup defaultValue="balanced">
        {[
          ["balanced", "Balanced"],
          ["detail", "More detail"],
          ["battery", "Save battery"],
        ].map(([value, label]) => (
          <Label key={value}>
            <Radio value={value}>
              <RadioIndicator />
            </Radio>
            {label}
          </Label>
        ))}
      </RadioGroup>
    </Field>
  );
}

function RatingDemo() {
  const [value, setValue] = useState<number | null>(4);
  return (
    <div className="demo-stack">
      <Rating
        aria-label="Rate this material"
        value={value}
        onValueChange={setValue}
      >
        <RatingItem>
          <Star aria-hidden="true" />
        </RatingItem>
      </Rating>
      <output className="demo-value">{value ?? 0} / 5</output>
    </div>
  );
}

function SegmentedControlDemo() {
  const [value, setValue] = useState<string | null>("day");
  return (
    <Field>
      <FieldLabel>Preview lighting</FieldLabel>
      <SegmentedControl value={value} onValueChange={setValue}>
        <SegmentedControlIndicator />
        <SegmentedControlItem value="day">Day</SegmentedControlItem>
        <SegmentedControlItem value="dusk">Dusk</SegmentedControlItem>
        <SegmentedControlItem value="night">Night</SegmentedControlItem>
      </SegmentedControl>
      <output className="demo-value">
        {value
          ? `${value[0].toUpperCase()}${value.slice(1)} selected`
          : "Choose lighting"}
      </output>
    </Field>
  );
}

function SelectDemo() {
  return (
    <Field>
      <FieldLabel>Surface treatment</FieldLabel>
      <Select defaultValue="regular">
        <SelectTrigger>
          <SelectValue />
          <ChevronDown aria-hidden="true" />
        </SelectTrigger>
        <SelectContent>
          {materials.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
              <SelectItemIndicator>
                <Check aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SliderDemo() {
  return (
    <Field>
      <Slider defaultValue={64} min={0} max={100}>
        <div className="demo-row">
          <FieldLabel>Frost intensity</FieldLabel>
          <SliderValue />
        </div>
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb />
          </SliderTrack>
        </SliderControl>
      </Slider>
      <FieldDescription>Drag the thumb or use the arrow keys.</FieldDescription>
    </Field>
  );
}

function SwitchDemo() {
  return (
    <div className="demo-stack">
      <Label>
        Ambient light
        <Switch defaultChecked>
          <SwitchThumb />
        </Switch>
      </Label>
      <Label>
        Edge highlights
        <Switch>
          <SwitchThumb />
        </Switch>
      </Label>
      <Label>
        Locked setting
        <Switch disabled defaultChecked>
          <SwitchThumb />
        </Switch>
      </Label>
    </div>
  );
}

function TextareaDemo() {
  const [value, setValue] = useState(
    "The toolbar stays readable as the background moves underneath it.",
  );
  return (
    <Field>
      <FieldLabel>Design notes</FieldLabel>
      <Textarea
        value={value}
        onValueChange={setValue}
        maxLength={240}
        rows={3}
      />
      <FieldDescription>{value.length} / 240 characters</FieldDescription>
    </Field>
  );
}

function ToggleDemo() {
  const [pressed, setPressed] = useState(false);
  return (
    <div className="demo-row">
      <Toggle pressed={pressed} onPressedChange={setPressed}>
        <ToggleIcon>
          <Bookmark aria-hidden="true" />
        </ToggleIcon>
        {pressed ? "Saved" : "Save material"}
      </Toggle>
      <span className="demo-muted">
        {pressed ? "In your collection" : "Add to your collection"}
      </span>
    </div>
  );
}

const tokenDraft: TokenInputValue = [
  "Review ",
  { type: "component", value: "toolbar", label: "Toolbar" },
  " in dark mode.",
];
const tokenComponents = [
  { value: "button", label: "Button" },
  { value: "toolbar", label: "Toolbar" },
  { value: "dialog", label: "Dialog" },
  { value: "slider", label: "Slider" },
];

function TokenInputDemo() {
  return (
    <Field>
      <FieldLabel>Component note</FieldLabel>
      <TokenInput
        defaultValue={tokenDraft}
        renderToken={(token) => (
          <TokenInputToken>
            {token.label}
            <TokenInputTokenRemove aria-label={`Remove ${token.label}`}>
              <X aria-hidden="true" />
            </TokenInputTokenRemove>
          </TokenInputToken>
        )}
      >
        <TokenInputEditor placeholder="Type @ to add a component" />
        <TriggerMenu
          aria-label="Component token suggestions"
          triggers={[{ char: "@", type: "component", items: tokenComponents }]}
        >
          <TriggerMenuContent>
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
      </TokenInput>
      <FieldDescription>Type @ to insert a component token.</FieldDescription>
    </Field>
  );
}

function TimeInputDemo() {
  return (
    <Field>
      <FieldLabel>Review time</FieldLabel>
      <TimeInput defaultValue="09:30" hourCycle={24} />
      <FieldDescription>24-hour time.</FieldDescription>
    </Field>
  );
}

function CalendarDemo() {
  return (
    <Calendar
      defaultValue="2026-11-24"
      locale="en-AU"
      weekStartsOn={1}
      aria-label="Review calendar"
    >
      <CalendarBody />
    </Calendar>
  );
}

export const inputDemos: Record<string, ComponentType> = {
  autocomplete: AutocompleteDemo,
  checkbox: CheckboxDemo,
  "color-picker": ColorPickerDemo,
  combobox: ComboboxDemo,
  "date-input": DateInputDemo,
  "date-picker": DatePickerDemo,
  field: FieldDemo,
  "file-input": FileInputDemo,
  input: InputDemo,
  label: LabelDemo,
  listbox: ListboxDemo,
  "number-input": NumberInputDemo,
  "otp-input": OTPInputDemo,
  "password-input": PasswordInputDemo,
  radio: RadioDemo,
  rating: RatingDemo,
  "segmented-control": SegmentedControlDemo,
  select: SelectDemo,
  slider: SliderDemo,
  switch: SwitchDemo,
  textarea: TextareaDemo,
  toggle: ToggleDemo,
  "token-input": TokenInputDemo,
  "time-input": TimeInputDemo,
  calendar: CalendarDemo,
};
