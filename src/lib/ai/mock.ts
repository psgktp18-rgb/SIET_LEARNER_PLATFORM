import { AiProvider, ChatOptions, TaskType } from './types';

// Realistic mock responses for different task types
const RESPONSES: Record<string, string> = {
  quizGeneration: `Here is a set of well-crafted quiz questions based on your topic:\n\n**Q1.** What is the primary difference between TCP and UDP?\n- A) TCP is faster than UDP\n- B) TCP provides reliable, ordered delivery while UDP does not\n- C) UDP supports error correction\n- D) TCP is connectionless\n\n**Answer: B** — TCP (Transmission Control Protocol) establishes a connection and guarantees delivery with acknowledgements, while UDP (User Datagram Protocol) is connectionless and offers no delivery guarantees.\n\n**Q2.** Which layer of the OSI model does TCP operate at?\n- A) Network Layer\n- B) Data Link Layer\n- C) Transport Layer\n- D) Application Layer\n\n**Answer: C** — TCP operates at Layer 4 (Transport Layer) of the OSI model.`,

  flashcardGeneration: `**Flashcard Set Generated:**\n\n📇 **Card 1**\n**Front:** What does TCP stand for?\n**Back:** Transmission Control Protocol — a connection-oriented protocol that provides reliable, ordered data delivery.\n\n📇 **Card 2**\n**Front:** What is the key advantage of UDP over TCP?\n**Back:** UDP has lower latency and overhead since it skips handshaking and error-checking — ideal for real-time applications like video streaming and gaming.\n\n📇 **Card 3**\n**Front:** What is the TCP 3-way handshake?\n**Back:** SYN → SYN-ACK → ACK. Client sends SYN, server responds with SYN-ACK, client confirms with ACK establishing a reliable connection.`,

  studyDoubtBot: `Great question! Let me explain this concept clearly.\n\nBased on the available course material:\n\n**TCP (Transmission Control Protocol)**\n- Connection-oriented protocol\n- Guarantees delivery and order of packets\n- Uses 3-way handshake (SYN, SYN-ACK, ACK)\n- Has flow control and congestion control\n- Used for: HTTP, email, file transfer\n\n**UDP (User Datagram Protocol)**\n- Connectionless protocol\n- No guarantee of delivery or order\n- Minimal overhead, very fast\n- Used for: video streaming, DNS, VoIP, gaming\n\n**Key Analogy:** TCP is like certified mail (you get a receipt), while UDP is like dropping a letter in a mailbox (faster, but no confirmation).`,

  classInsights: `**AI Class Insights Report**\n\n📊 **Performance Overview**\nBased on the class data, here are the key insights:\n\n- **Average Score:** 72% (Above department average of 68%)\n- **Top Performers:** 8 students scoring above 85%\n- **At-Risk Students:** 4 students below the 60% threshold\n\n🎯 **Recommended Actions:**\n1. Schedule extra sessions for Unit 3 (lowest avg: 58%)\n2. Recognise top performers with merit badges\n3. Assign targeted practice problems for weak topics\n\n📈 **Attendance Correlation:** Students with 85%+ attendance score 20% higher on average.`,

  assignmentFeedback: `**Assignment Feedback Summary**\n\n✅ **Strengths Identified:**\n- Clear problem statement and structured approach\n- Good use of diagrams to explain network topology\n- Correct implementation of the core algorithm\n\n⚠️ **Areas for Improvement:**\n- Add error handling for edge cases\n- Reference more scholarly sources (at least 3)\n- Improve conclusion — tie findings back to objectives\n\n📝 **Suggested Grade Range:** B+ (78-82%)\n\nOverall a solid submission demonstrating understanding of the core concepts. Minor improvements in documentation would elevate this to an A-grade submission.`,

  revisionTools: `**Revision Summary**\n\nHere's a concise summary for quick revision:\n\n## Key Concepts\n\n### Computer Networks\n- **OSI Model:** 7 layers — Physical, Data Link, Network, Transport, Session, Presentation, Application\n- **TCP/IP Suite:** 4 layers — Network Access, Internet, Transport, Application\n- **Routing Protocols:** RIP (distance vector), OSPF (link state), BGP (path vector)\n\n### Important Formulae\n- **Bandwidth-Delay Product** = Bandwidth × RTT\n- **Efficiency (Stop-and-Wait)** = 1 / (1 + 2a) where a = propagation delay / transmission time\n\n> 💡 **Exam Tip:** Focus on the differences between connection-oriented and connectionless services — this appears in almost every exam!`,

  platformHelpBot: `**How can I help you with Lecture Lens?** 🎓\n\nHere's what you can do on this platform:\n\n📚 **For Students:**\n- View your enrolled classrooms and attendance\n- Access notes, assignments, and tests\n- Use AI Tutor for concept explanations\n- Generate flashcards and practice quizzes\n\n👩‍🏫 **For Teachers:**\n- Manage classrooms and post notes\n- Create assignments with AI rubrics\n- View student attendance and performance\n- Use AI Studio to generate quiz questions\n\nIs there a specific feature you need help with? Feel free to ask!`,

  shortAnswerGrading: `**Auto-Grading Report**\n\n📝 Evaluated 24 student submissions.\n\n| Score Range | Students | Percentage |\n|-------------|----------|------------|\n| 90-100 | 4 | 17% |\n| 75-89 | 9 | 37% |\n| 60-74 | 7 | 29% |\n| Below 60 | 4 | 17% |\n\n**Class Average:** 74.2 / 100\n\n⚠️ **Common mistakes detected:**\n- 12 students missed the time-complexity analysis\n- 6 students confused best-case vs worst-case\n\n✅ Grades have been saved. Review suggested for borderline submissions (65-70 range).`,
};

function getResponseForTask(options: ChatOptions): string {
  const taskType = options.taskType;
  const lastMsg = options.messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // Return task-specific response or derive from context
  if (RESPONSES[taskType]) return RESPONSES[taskType];
  
  return `I understand your question about: "${lastMsg.slice(0, 60)}${lastMsg.length > 60 ? '...' : ''}"\n\nThis is a mock AI response for local development. The system is functioning correctly.\n\nIn production with a valid Gemini API key, you would receive a detailed, contextually accurate answer tailored to your specific question. The AI would analyze your query and provide step-by-step explanations, examples, and references relevant to your engineering curriculum at SIET.`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class MockProvider implements AiProvider {
  name = 'mock';

  async chat(options: ChatOptions): Promise<string> {
    await sleep(300);
    return getResponseForTask(options);
  }

  async chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void> {
    const fullResponse = getResponseForTask(options);
    // Stream word by word with realistic pacing
    const words = fullResponse.split(' ');
    for (const word of words) {
      onChunk(word + ' ');
      await sleep(25); // 25ms per word = realistic typing speed
    }
  }

  async embed(text: string): Promise<number[]> {
    return Array(1536).fill(0.1);
  }

  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> {
    await sleep(500);
    
    // Generate valid mock JSON structures based on task type
    if (taskType === 'quizGeneration' || prompt.toLowerCase().includes('quiz')) {
      const mock = {
        questions: [
          {
            question: 'What is the primary purpose of a computer network?',
            options: ['To store data', 'To connect computers and share resources', 'To process data faster', 'To display graphics'],
            correctIndex: 1,
            explanation: 'A computer network connects multiple computing devices to share resources, data, and services.',
            difficulty: 'EASY',
          },
          {
            question: 'Which protocol is responsible for IP address assignment?',
            options: ['FTP', 'DNS', 'DHCP', 'HTTP'],
            correctIndex: 2,
            explanation: 'DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to devices on a network.',
            difficulty: 'MEDIUM',
          },
          {
            question: 'What does DNS stand for in networking?',
            options: ['Data Network Service', 'Domain Name System', 'Dynamic Network Server', 'Distributed Node System'],
            correctIndex: 1,
            explanation: 'DNS (Domain Name System) translates human-readable domain names (like google.com) into IP addresses.',
            difficulty: 'EASY',
          },
        ]
      };
      try { return schema.parse(mock) as T; } catch { return mock as unknown as T; }
    }

    if (taskType === 'flashcardGeneration' || prompt.toLowerCase().includes('flashcard')) {
      const mock = {
        cards: [
          { front: 'What is TCP?', back: 'Transmission Control Protocol — a reliable, connection-oriented transport protocol that guarantees ordered delivery of data.' },
          { front: 'What is UDP?', back: 'User Datagram Protocol — a fast, connectionless protocol with no delivery guarantee, used for real-time applications.' },
          { front: 'What is the OSI Model?', back: 'A 7-layer conceptual framework: Physical, Data Link, Network, Transport, Session, Presentation, Application.' },
        ]
      };
      try { return schema.parse(mock) as T; } catch { return mock as unknown as T; }
    }

    // Generic fallback
    return {} as T;
  }
}
