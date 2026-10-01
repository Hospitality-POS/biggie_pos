import React, { useState, useMemo } from "react";
import { useTenantModules } from "@hooks/useTenantModules";
import { useIsMobile } from "./hooks/useIsMobile";
import { useShopSelector } from "./hooks/useShopSelector";
import { useSoundPlayer } from "./hooks/useSoundPlayer";
import { useDraggableFab } from "./hooks/useDraggableFab";
import { useBiasharaChat } from "./hooks/useBiasharaChat";
import { useThinkingPhase } from "./hooks/useThinkingPhase";
import { buildCuratedPrompts } from "./services/biasharaAI.service";
import { BiasharaFabButton } from "./components/BiasharaFabButton";
import { BiasharaDrawer } from "./components/BiasharaDrawer";
import { BiasharaDrawerHeader } from "./components/BiasharaDrawerHeader";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInputBar } from "./components/ChatInputBar";

export const BiasharaAI: React.FC = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Shop selector state
  const {
    shops,
    loadingShops,
    selectedShopId,
    setSelectedShopId,
    currentShop,
  } = useShopSelector();

  // Sound playback
  const {
    speakingMessageId,
    liveSoundEnabled,
    toggleLiveSound,
    handleSpeakMessage,
  } = useSoundPlayer(open);

  // FAB Dragging
  const { fabPos, fabRef, onFabStart, onFabDrag, onFabStop, handleFabClick } =
    useDraggableFab();

  // Chat lifecycle
  const {
    messages,
    input,
    setInput,
    loading,
    selectedStage,
    setSelectedStage,
    chatBodyRef,
    ask,
    handleRetry,
    handleSend,
    handleClearChat,
    handleKeyDown,
  } = useBiasharaChat({
    selectedShopId,
    drawerOpen: open,
    onAiResponseGenerated: (aiId, text) => {
      if (liveSoundEnabled) {
        handleSpeakMessage(aiId, text);
      }
    },
  });

  // Dynamic ThinkingOrb phase
  const { loadingElapsedSec, thinkingPhase } = useThinkingPhase(
    loading,
    currentShop,
    selectedStage
  );

  // Tenant contextual prompt suggestions
  const { hasPOS, hasAccounting } = useTenantModules();
  const curatedPrompts = useMemo(
    () => buildCuratedPrompts(hasPOS, hasAccounting),
    [hasPOS, hasAccounting]
  );

  return (
    <>
      <BiasharaFabButton
        fabRef={fabRef}
        fabPos={fabPos}
        onFabStart={onFabStart}
        onFabDrag={onFabDrag}
        onFabStop={onFabStop}
        onClick={() => handleFabClick(() => setOpen(true))}
        loading={loading}
        isMobile={isMobile}
      />

      <BiasharaDrawer
        open={open}
        onClose={() => setOpen(false)}
        isMobile={isMobile}
        header={
          <BiasharaDrawerHeader
            currentShop={currentShop}
            shops={shops}
            loadingShops={loadingShops}
            selectedShopId={selectedShopId}
            onSelectShopId={setSelectedShopId}
            selectedStage={selectedStage}
            onSelectStage={setSelectedStage}
            liveSoundEnabled={liveSoundEnabled}
            onToggleLiveSound={toggleLiveSound}
            loading={loading}
            loadingElapsedSec={loadingElapsedSec}
            hasMessages={messages.length > 0}
            onClearChat={handleClearChat}
            onClose={() => setOpen(false)}
          />
        }
        footer={
          <ChatInputBar
            input={input}
            setInput={setInput}
            loading={loading}
            shopName={currentShop?.name}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
          />
        }
      >
        <ChatMessageList
          messages={messages}
          loading={loading}
          shopName={currentShop?.name}
          curatedPrompts={curatedPrompts}
          speakingMessageId={speakingMessageId}
          thinkingPhase={thinkingPhase}
          loadingElapsedSec={loadingElapsedSec}
          chatBodyRef={chatBodyRef}
          onSelectPrompt={ask}
          onTogglePlay={handleSpeakMessage}
          onRetry={handleRetry}
        />
      </BiasharaDrawer>
    </>
  );
};

export default BiasharaAI;
