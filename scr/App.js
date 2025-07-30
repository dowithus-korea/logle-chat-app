import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./App.css";

// API 키 (복사한 키로 교체하세요)
const API_KEY =
  process.env.REACT_APP_GEMINI_API_KEY ||
  "AIzaSyADV2d_Ro-M_4ZpTefn2sz3_2u5beMAOo0";
const genAI = new GoogleGenerativeAI(API_KEY);

const SHEETS_ID = "1vEHB94hI2bFYL86Pj64zXxKnz25OsZKQjsg4_U491Bw";

// 로글 플랫폼 정보
const LOGLE_INFO = `
로글(www.logle.kr)은 유니크한 싱글들을 위한 만남 플랫폼입니다.

주요 서비스 내용:
1. Group MEET: 나이대별/주제별 온오프라인 그룹활동(일반유저가 호스팅하는 밋)
2. Event MEET: 호프, 카페 등에서 진행하는 싱글활동(숍호스트가 호스팅하는 밋)
3. 호감매칭: 이성간 매칭 시스템 (1:1 매칭톡 제공)
4. 케미친구: 동성간 친구 등록 기능
`;
// 구글시트 CSV 데이터 읽기 함수
const readGoogleSheetCSV = async () => {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/1vEHB94hI2bFYL86Pj64zXxKnz25OsZKQjsg4_U491Bw/export?format=csv`;
    const response = await fetch(csvUrl);
    const csvData = await response.text();

    console.log(
      "구글시트 CSV 데이터 읽기 성공:",
      csvData.substring(0, 200) + "..."
    );

    // CSV를 텍스트로 변환하여 AI 학습용 데이터로 만들기
    const formattedData = csvData
      .split("\n")
      .map((row) => row.replace(/"/g, ""))
      .join("\n");

    return `\n=== 구글시트 추가 정보 ===\n${formattedData}\n`;
  } catch (error) {
    console.log("구글시트 데이터 읽기 실패:", error.message);
    return "";
  }
};
const App = () => {
  const [nickname, setNickname] = useState("");
  const [isNicknameSet, setIsNicknameSet] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const messagesEndRef = useRef(null);
  const handleBackToStart = () => {
    setIsNicknameSet(false);
    setNickname("");
    setMessages([]);
    setInputMessage("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNicknameSubmit = () => {
    if (nickname.trim()) {
      setIsNicknameSet(true);
      setMessages([
        {
          id: uuidv4(),
          text: `안녕하세요 ${nickname}님! 로글 플랫폼에 대해 궁금한 것이 있으시면 언제든 물어보세요.`,
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    }
  };
  // 기존 handleSendMessage 함수를 이 코드로 완전히 교체하세요
  // 현재 handleSendMessage 함수 전체를 이것으로 교체하세요

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: uuidv4(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      console.log("실시간 웹사이트 데이터 수집 시작...");

      // 실시간 웹사이트 데이터 수집
      let websiteData = "";
      const urls = [
        "https://www.logle.kr",
        "https://www.logle.kr/service-guideline",
        "https://www.logle.kr/regulation-refund",
        "https://www.logle.kr/term-conditions",
      ];

      for (const url of urls) {
        try {
          // CORS 우회를 위한 프록시 서버 사용
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);
          const html = await response.text();
          const textContent = html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          websiteData += `\n[${url} 최신 정보]\n${textContent.substring(
            0,
            800
          )}...\n`;
        } catch (error) {
          console.log(`${url} 수집 실패, 기본 정보 사용`);
        }
      }
      console.log("웹사이트 데이터 수집 완료");

      // 구글시트 데이터 수집
      console.log("구글시트 데이터 수집 시작...");
      const googleSheetData = await readGoogleSheetCSV();
      console.log("구글시트 데이터 수집 완료");

      // 통합 정보로 강화된 프롬프트 생성 (웹사이트 + 구글시트)
      const enhancedInfo = LOGLE_INFO + websiteData + googleSheetData;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
당신은 로글(www.logle.kr) 플랫폼의 전문 고객상담 AI입니다. 
실시간 수집된 최신 정보를 바탕으로 정확하고 친절하게 답변해주세요.

=== 로글 플랫폼 통합 정보 ===
${enhancedInfo}

=== 고객 질문 ===
${currentMessage}

=== 답변 지침 ===
1. 실시간 수집된 정보를 우선 활용하여 정확한 답변 제공
2. 옐로카드: "호스팅/참가 취소 시 1개월 서비스 이용정지" 설명
3. 환불: 구체적인 환불 규정과 조건 안내
4. 불확실한 정보: "정확한 내용은 로글 고객지원/문의남기기를 통해서 문의 남겨주시면 감사하겠습니다"
5. 친근하고 정중한 톤, 한국어로 2-6문장 적절한 길이
6. 고객 상황에 공감하며 실질적 도움 제공

답변해주세요.
`;

      console.log("AI 응답 생성 중...");

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponseText = response.text();

      console.log("AI 응답 완료:", aiResponseText.substring(0, 100) + "...");

      const aiMessage = {
        id: uuidv4(),
        text: aiResponseText,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("오류 발생:", error.message);

      // 백업 응답 (기본 정보만으로)
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const fallbackPrompt = `
로글 플랫폼 고객상담 AI입니다. 기본 정보로 친절하게 답변해주세요:

${LOGLE_INFO}

고객 질문: ${currentMessage}

로글 정보를 바탕으로 정확하고 친절하게 답변해주세요.
`;

        const fallbackResult = await model.generateContent(fallbackPrompt);
        const fallbackResponse = await fallbackResult.response;

        const aiMessage = {
          id: uuidv4(),
          text: fallbackResponse.text(),
          sender: "ai",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (finalError) {
        const errorMessage = {
          id: uuidv4(),
          text: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 긴급한 문의는 help@logle.kr로 연락해주세요.",
          sender: "ai",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isNicknameSet) {
        handleSendMessage();
      } else {
        handleNicknameSubmit();
      }
    }
  };

  if (!isNicknameSet) {
    return (
      <div className="app">
        <div className="nickname-container">
          <div className="header">
            <h1 className="title">로글 고객전용 Gemini AI채팅상담</h1>
            <p className="description">
              본 채팅은 로글 플랫폼의 약관 및 이용방법 및 규정을 습득한 구글
              Gemini AI가 고객분에게 제공하는 채팅상담이오니, 참고만 하시길
              바라며, 본 채팅내용은 로글 관리자가 제공하는 상담이 아님을 밝히며
              회사는 채팅내용에 책임을 지지않습니다.
            </p>
          </div>
          <div className="nickname-input-section">
            <input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={handleKeyPress}
              className="nickname-input"
              maxLength={20}
            />
            <button
              onClick={handleNicknameSubmit}
              className="confirm-button"
              disabled={!nickname.trim()}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-header">
        <button className="back-button" onClick={handleBackToStart}>
          ← 처음으로
        </button>
        <div className="header-info">
          <h2 className="chat-title">로글 AI 상담</h2>
          <span className="nickname-display">{nickname}님</span>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-area">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender}`}>
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              className="message-input"
              rows="1"
            />
            <button
              onClick={handleSendMessage}
              className="send-button"
              disabled={!inputMessage.trim() || isLoading}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
