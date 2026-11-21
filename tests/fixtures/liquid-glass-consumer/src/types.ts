import { LiquidChat, type LiquidChatMessage } from "@quantitative-hci/liquid-glass/chat";
import { liquidModelDocument, type ModelDocumentHandle } from "@quantitative-hci/liquid-glass/modeling";
import { LiquidViewport, type LiquidViewportProps } from "@quantitative-hci/liquid-glass/viewport";
import { LiquidAppNavigation, type LiquidAppNavigationItem } from "@quantitative-hci/liquid-glass/layouts";

export const installedTypes = { LiquidChat, liquidModelDocument, LiquidViewport, LiquidAppNavigation };
export type InstalledContracts = {
  message: LiquidChatMessage;
  document: ModelDocumentHandle;
  viewport: LiquidViewportProps;
  navigation: LiquidAppNavigationItem;
};
