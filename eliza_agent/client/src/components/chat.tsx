import { Button } from "@/components/ui/button";
import {
    ChatBubble,
    ChatBubbleMessage,
    ChatBubbleTimestamp,
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useTransition, animated, type AnimatedProps } from "@react-spring/web";
import { Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState, useCallback, memo } from "react";
import type { Content, UUID } from "@elizaos/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { cn, moment } from "@/lib/utils";
import { Avatar, AvatarImage } from "./ui/avatar";
import CopyButton from "./copy-button";
import ChatTtsButton from "./ui/chat/chat-tts-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { IAttachment } from "@/types";
import { AudioRecorder } from "./audio-recorder";
import { Badge } from "./ui/badge";
import { useAutoScroll } from "./ui/chat/hooks/useAutoScroll";
//import LinkFormatter from "./ui/formatter";
import React from "react";
import AIWriter from "react-aiwriter";

type ExtraContentFields = {
    user: string;
    createdAt: number;
    isLoading?: boolean;
};

type ContentWithUser = Content & ExtraContentFields;

type AnimatedDivProps = AnimatedProps<{ style: React.CSSProperties }> & {
    children?: React.ReactNode;
};

interface ChatInputSectionProps {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    selectedFile: File | null;
    setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
    handleSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
    sendMessageMutation: any; // Using any since we don't have the full type definition
    agentId: UUID;
}

// Separate input component to prevent parent re-renders when typing
const ChatInputSection: React.FC<ChatInputSectionProps> = ({
    input, 
    setInput, 
    selectedFile, 
    setSelectedFile,
    handleSendMessage, 
    sendMessageMutation,
    agentId
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    
    // Use useCallback to memoize these functions
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (e.nativeEvent.isComposing) return;
            formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    }, []);
    
    const handleAttachClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);
    
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file?.type.startsWith("image/")) {
            setSelectedFile(file);
        }
    }, [setSelectedFile]);
    
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, [setInput]);
    
    const handleRemoveFile = useCallback(() => {
        setSelectedFile(null);
    }, [setSelectedFile]);
    
    // // Focus input on mount
    // useEffect(() => {
    //     if (inputRef.current) {
    //         inputRef.current.focus();
    //     }
    // }, []);
    
    return (
        <div className="px-4 pb-4">
            <form
                ref={formRef}
                onSubmit={handleSendMessage}
                className="relative rounded-md border bg-card"
            >
                {selectedFile ? (
                    <div className="p-3 flex">
                        <div className="relative rounded-md border p-2">
                            <Button
                                onClick={handleRemoveFile}
                                className="absolute -right-2 -top-2 size-[22px] ring-2 ring-background"
                                variant="outline"
                                size="icon"
                            >
                                <X />
                            </Button>
                            <img
                                alt="Selected file"
                                src={URL.createObjectURL(selectedFile)}
                                height="100%"
                                width="100%"
                                className="aspect-square object-contain w-16"
                            />
                        </div>
                    </div>
                ) : null}
                <ChatInput
                    ref={inputRef}
                    onKeyDown={handleKeyDown}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type your message here..."
                    className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center p-3 pt-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleAttachClick}
                                >
                                    <Paperclip className="size-4" />
                                    <span className="sr-only">
                                        Attach file
                                    </span>
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Attach file</p>
                        </TooltipContent>
                    </Tooltip>
                    <AudioRecorder
                        agentId={agentId}
                        onChange={(newInput: string) => setInput(newInput)}
                    />
                    <Button
                        disabled={!input || sendMessageMutation?.isPending}
                        type="submit"
                        size="sm"
                        className="ml-auto gap-1.5 h-[30px]"
                    >
                        {sendMessageMutation?.isPending
                            ? "..."
                            : "Send Message"}
                        <Send className="size-3.5" />
                    </Button>
                </div>
            </form>
        </div>
    );
};

interface MessageListProps {
    messages: ContentWithUser[];
    transitions: any; // Using any for now as the full type is complex
    getMessageVariant: (role: string) => "received" | "sent";
    scrollRef: React.RefObject<HTMLDivElement>;
    isAtBottom: boolean;
    scrollToBottom: () => void;
    disableAutoScroll: () => void;
    agentId: UUID;
}

// Create a memoized message list component
const MessageList: React.FC<MessageListProps> = ({ 
    messages, 
    transitions, 
    getMessageVariant, 
    scrollRef, 
    isAtBottom, 
    scrollToBottom, 
    disableAutoScroll,
    agentId
}) => {
    const CustomAnimatedDiv = animated.div as React.FC<AnimatedDivProps>;

    if (messages){
        
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <ChatMessageList 
                scrollRef={scrollRef}
                isAtBottom={isAtBottom}
                scrollToBottom={scrollToBottom}
                disableAutoScroll={disableAutoScroll}
            >
                {transitions((style: any, message: ContentWithUser) => {
                    const variant = getMessageVariant(message?.user);
                    return (
                        <CustomAnimatedDiv
                            style={{
                                ...style,
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                padding: "1rem",
                            }}
                        >
                            <ChatBubble
                                variant={variant}
                                className="flex flex-row items-center gap-2"
                            >
                                {message?.user !== "user" ? (
                                    <Avatar className="size-8 p-1 border rounded-full select-none">
                                        <AvatarImage src="/bot.png" />
                                    </Avatar>
                                ) : null}
                                <div className="flex flex-col">
                                    <ChatBubbleMessage
                                        isLoading={message?.isLoading}
                                    >
                                        {message?.user !== "user" ? (
                                            <AIWriter>
                                                {message?.text}
                                            </AIWriter>
                                        ) : (
                                            message?.text
                                        )}
                                        {/* Attachments */}
                                        <div>
                                            {message?.attachments?.map(
                                                (attachment: IAttachment) => (
                                                    <div
                                                        className="flex flex-col gap-1 mt-2"
                                                        key={`${attachment.url}-${attachment.title}`}
                                                    >
                                                        <img
                                                            alt="attachment"
                                                            src={attachment.url}
                                                            width="100%"
                                                            height="100%"
                                                            className="w-64 rounded-md"
                                                        />
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span />
                                                            <span />
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </ChatBubbleMessage>
                                    <div className="flex items-center gap-4 justify-between w-full mt-1">
                                        {message?.text &&
                                        !message?.isLoading ? (
                                            <div className="flex items-center gap-1">
                                                <CopyButton
                                                    text={message?.text}
                                                />
                                                <ChatTtsButton
                                                    agentId={agentId}
                                                    text={message?.text}
                                                />
                                            </div>
                                        ) : null}
                                        <div
                                            className={cn([
                                                message?.isLoading
                                                    ? "mt-2"
                                                    : "",
                                                "flex items-center justify-between gap-4 select-none",
                                            ])}
                                        >
                                            {message?.source ? (
                                                <Badge variant="outline">
                                                    {message.source}
                                                </Badge>
                                            ) : null}
                                            {message?.action ? (
                                                <Badge variant="outline">
                                                    {message.action}
                                                </Badge>
                                            ) : null}
                                            {message?.createdAt ? (
                                                <ChatBubbleTimestamp
                                                    timestamp={moment(
                                                        message?.createdAt
                                                    ).format("LT")}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </ChatBubble>
                        </CustomAnimatedDiv>
                    );
                })}
            </ChatMessageList>
        </div>
    );
};

// Memoize this component to prevent re-renders
const MemoizedMessageList = memo(MessageList);

// Define the mutation type more specifically
interface SendMessageMutationResult {
    isPending: boolean;
    mutate: (payload: { message: string; selectedFile: File | null }) => void;
}

export default function Page({ agentId }: { agentId: UUID }) {
    const { toast } = useToast();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [input, setInput] = useState("");
    const queryClient = useQueryClient();

    const getMessageVariant = useCallback((role: string): "received" | "sent" =>
        role !== "user" ? "received" : "sent",
    []);

    const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
        smooth: true,
    });
   
    useEffect(() => {
        scrollToBottom();
    }, [queryClient.getQueryData(["messages", agentId])]);

    useEffect(() => {
        scrollToBottom();
    }, []);

    const sendMessageMutation = useMutation({
        mutationKey: ["send_message", agentId],
        mutationFn: ({
            message,
            selectedFile,
        }: {
            message: string;
            selectedFile?: File | null;
        }) => apiClient.sendMessage(agentId, message, selectedFile),
        onSuccess: (newMessages: ContentWithUser[]) => {
            queryClient.setQueryData(
                ["messages", agentId],
                (old: ContentWithUser[] = []) => [
                    ...old.filter((msg) => !msg.isLoading),
                    ...newMessages.map((msg) => ({
                        ...msg,
                        createdAt: Date.now(),
                    })),
                ]
            );
        },
        onError: (e: Error) => {
            toast({
                variant: "destructive",
                title: "Unable to send message",
                description: e.message,
            });
        },
    }) as SendMessageMutationResult; // Type assertion for proper typing

    const handleSendMessage = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input) return;

        const attachments: IAttachment[] | undefined = selectedFile
            ? [
                  {
                      url: URL.createObjectURL(selectedFile),
                      contentType: selectedFile.type,
                      title: selectedFile.name,
                  },
              ]
            : undefined;

        const newMessages = [
            {
                text: input,
                user: "user",
                createdAt: Date.now(),
                attachments,
            },
            {
                text: input,
                user: "system",
                isLoading: true,
                createdAt: Date.now(),
            },
        ];

        queryClient.setQueryData(
            ["messages", agentId],
            (old: ContentWithUser[] = []) => [...old, ...newMessages]
        );

        sendMessageMutation.mutate({
            message: input,
            selectedFile: selectedFile ? selectedFile : null,
        });

        setSelectedFile(null);
        setInput("");
    }, [input, selectedFile, queryClient, agentId, sendMessageMutation]);

    const messages =
        queryClient.getQueryData<ContentWithUser[]>(["messages", agentId]) ||
        [];

    const transitions = useTransition(messages, {
        keys: (message) =>
            `${message.createdAt}-${message.user}-${message.text?.substring(0, 10) || ""}`,
        from: { opacity: 0, transform: "translateY(50px)" },
        enter: { opacity: 1, transform: "translateY(0px)" },
        leave: { opacity: 0, transform: "translateY(10px)" },
    });

    return (
        <div className="flex flex-col w-full h-[calc(100dvh)] p-4">
            <MemoizedMessageList 
                messages={messages}
                transitions={transitions}
                getMessageVariant={getMessageVariant}
                scrollRef={scrollRef as any}
                isAtBottom={isAtBottom}
                scrollToBottom={scrollToBottom}
                disableAutoScroll={disableAutoScroll}
                agentId={agentId}
            />
            
            <ChatInputSection 
                input={input}
                setInput={setInput}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                handleSendMessage={handleSendMessage}
                sendMessageMutation={sendMessageMutation}
                agentId={agentId}
            />
        </div>
    );
}