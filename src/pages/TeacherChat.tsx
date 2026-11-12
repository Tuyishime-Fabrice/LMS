import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TeacherHeader } from "@/components/TeacherHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, MessageSquare, Users, Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentConversation {
  id: string;
  student_id: string;
  teacher_id: string;
  student_name: string;
  student_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface EnrolledStudent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

// Skeleton components
const ConversationSkeleton = () => (
  <div className="p-4 border-b border-white/10">
    <div className="flex items-start gap-3">
      <Skeleton className="h-12 w-12 rounded-full bg-white/20" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24 bg-white/20" />
        <Skeleton className="h-3 w-32 bg-white/20" />
      </div>
    </div>
  </div>
);

const MessageSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-start">
      <Skeleton className="h-16 w-48 rounded-2xl" />
    </div>
    <div className="flex justify-end">
      <Skeleton className="h-12 w-40 rounded-2xl" />
    </div>
    <div className="flex justify-start">
      <Skeleton className="h-20 w-56 rounded-2xl" />
    </div>
  </div>
);

export default function TeacherChat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<StudentConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<StudentConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New conversation dialog
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation && !selectedConversation.id.startsWith('new-')) {
      fetchMessages();
      markMessagesAsRead();
    } else if (selectedConversation?.id.startsWith('new-')) {
      setMessages([]);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('teacher-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          // Refresh conversations and messages
          fetchConversations();
          if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    if (!user?.id) return;

    try {
      // Get all enrolled students from teacher's courses
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", user.id);

      const courseIds = courses?.map(c => c.id) || [];

      if (courseIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get enrolled students
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select(`
          student_id,
          profiles:student_id (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .in("course_id", courseIds);

      // Create unique students map
      const studentsMap = new Map<string, EnrolledStudent>();
      enrollments?.forEach((e: any) => {
        if (e.profiles && !studentsMap.has(e.student_id)) {
          studentsMap.set(e.student_id, {
            id: e.profiles.id,
            full_name: e.profiles.full_name || 'Student',
            avatar_url: e.profiles.avatar_url,
            email: e.profiles.email || '',
          });
        }
      });

      setEnrolledStudents(Array.from(studentsMap.values()));

      // Fetch existing conversations
      const { data: existingConvs, error } = await supabase
        .from("conversations")
        .select(`
          id,
          student_id,
          teacher_id,
          updated_at,
          profiles!conversations_student_id_fkey (
            full_name,
            avatar_url
          ),
          direct_messages (
            message_text,
            created_at,
            sender_id,
            is_read
          )
        `)
        .eq("teacher_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        setLoading(false);
        return;
      }

      const conversationsList: StudentConversation[] = [];
      const existingStudentIds = new Set<string>();

      // Add existing conversations
      existingConvs?.forEach((conv: any) => {
        existingStudentIds.add(conv.student_id);
        const messages = conv.direct_messages || [];
        const sortedMessages = [...messages].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMsg = sortedMessages[0];
        const unreadCount = messages.filter(
          (m: any) => !m.is_read && m.sender_id !== user.id
        ).length;

        conversationsList.push({
          id: conv.id,
          student_id: conv.student_id,
          teacher_id: conv.teacher_id,
          student_name: conv.profiles?.full_name || "Unknown Student",
          student_avatar: conv.profiles?.avatar_url || null,
          last_message: lastMsg?.message_text || null,
          last_message_at: lastMsg?.created_at || null,
          unread_count: unreadCount,
        });
      });

      // Sort by last message time, then unread count
      conversationsList.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        if (a.last_message_at && b.last_message_at) {
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        }
        if (a.last_message_at) return -1;
        if (b.last_message_at) return 1;
        return 0;
      });

      setConversations(conversationsList);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation || selectedConversation.id.startsWith('new-')) return;

    setMessagesLoading(true);
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", selectedConversation.id)
      .order("created_at", { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
    setMessagesLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation || selectedConversation.id.startsWith('new-')) return;

    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("conversation_id", selectedConversation.id)
      .eq("is_read", false)
      .neq("sender_id", user?.id);

    // Update local state
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation.id ? { ...conv, unread_count: 0 } : conv
    ));
  };

  const handleStartNewChat = (student: EnrolledStudent) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.student_id === student.id);
    if (existing) {
      setSelectedConversation(existing);
      setShowNewChatDialog(false);
      return;
    }

    // Create temporary conversation
    const newConv: StudentConversation = {
      id: `new-${student.id}`,
      student_id: student.id,
      teacher_id: user?.id || '',
      student_name: student.full_name,
      student_avatar: student.avatar_url,
      last_message: null,
      last_message_at: null,
      unread_count: 0,
    };

    setSelectedConversation(newConv);
    setMessages([]);
    setShowNewChatDialog(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    let conversationId = selectedConversation.id;

    // If it's a new conversation, create it first
    if (conversationId.startsWith('new-')) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          student_id: selectedConversation.student_id,
          teacher_id: user?.id,
        })
        .select()
        .single();

      if (convError) {
        toast.error("Failed to create conversation");
        return;
      }

      conversationId = newConv.id;

      // Update selected conversation with real ID
      const updatedConv = { ...selectedConversation, id: conversationId };
      setSelectedConversation(updatedConv);
      
      // Add to conversations list
      setConversations(prev => [updatedConv, ...prev]);
    }

    const { error } = await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: user?.id,
      message_text: newMessage,
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      fetchMessages();
      fetchConversations();
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) return "Today";
    if (messageDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = enrolledStudents.filter(s => 
    s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <TeacherSidebar />

        <div className="flex-1 flex flex-col">
          <TeacherHeader 
            title={t('chat.messages')}
            subtitle={t('teacher.chat.manageGroupChat')}
          >
            <Button 
              onClick={() => setShowNewChatDialog(true)}
              className="bg-[#006d2c] hover:bg-[#005523]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('chat.sendMessage')}
            </Button>
          </TeacherHeader>

          {/* Chat Layout */}
          <div className="flex-1 flex overflow-hidden m-4 mt-0">
            {/* Conversations Sidebar */}
            <div className="w-80 border-r bg-white flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">{t('chat.messages')}</h2>
                  {totalUnread > 0 && (
                    <Badge className="bg-[#006d2c]">{totalUnread}</Badge>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('teacher.chat.searchStudents')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <>
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                  </>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('chat.noConversationsYet')}</p>
                    <Button 
                      variant="link" 
                      className="text-[#006d2c] mt-2"
                      onClick={() => setShowNewChatDialog(true)}
                    >
                      {t('chat.startConversation')}
                    </Button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 border-b hover:bg-gray-50 transition-colors text-left ${
                        selectedConversation?.id === conv.id ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {conv.student_avatar ? (
                            <img src={conv.student_avatar} alt={conv.student_name} className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-[#006d2c] text-white text-sm">
                              {conv.student_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className="font-medium text-sm text-gray-900 truncate">{conv.student_name}</h3>
                            {conv.last_message_at && (
                              <span className="text-xs text-gray-400">
                                {formatDate(conv.last_message_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {conv.last_message || "No messages yet"}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge className="mt-1 bg-[#006d2c] text-xs">{conv.unread_count} {t('chat.newMessages')}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            {selectedConversation ? (
              <div className="flex-1 flex flex-col bg-gray-50">
                {/* Chat Header */}
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {selectedConversation.student_avatar ? (
                        <img src={selectedConversation.student_avatar} alt={selectedConversation.student_name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-[#006d2c] text-white">
                          {selectedConversation.student_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedConversation.student_name}</h3>
                      <p className="text-xs text-gray-500">{t('teacher.chat.student')}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <MessageSkeleton />
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">{t('chat.noMessagesYet')}</p>
                        <p className="text-sm text-gray-400">{t('chat.startTheConversation')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user?.id;
                        const showDate = index === 0 || 
                          formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                                  {formatDate(message.created_at)}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isOwn 
                                  ? "bg-[#006d2c] text-white rounded-br-sm" 
                                  : "bg-white text-gray-900 rounded-bl-sm shadow-sm"
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                                <span className={`text-xs mt-1 block text-right ${isOwn ? "text-white/70" : "text-gray-400"}`}>
                                  {formatTime(message.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t('chat.typeMessage')}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-[#006d2c] hover:bg-[#005523]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-1">{t('teacher.chat.selectConversation')}</h3>
                  <p className="text-sm text-gray-500">{t('teacher.chat.chooseStudent')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Chat Dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('chat.sendMessage')}</DialogTitle>
              <DialogDescription>
                {t('teacher.chat.chooseStudent')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('teacher.chat.searchStudents')}
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('teacher.students.noStudentsFound')}</p>
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const hasConversation = conversations.some(c => c.student_id === student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleStartNewChat(student)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt={student.full_name} className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-[#006d2c] text-white text-sm">
                              {student.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{student.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{student.email}</p>
                        </div>
                        {hasConversation && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
