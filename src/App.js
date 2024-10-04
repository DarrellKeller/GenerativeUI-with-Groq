import React, { useState, useRef, useEffect } from 'react';
import './output.css';

function App() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Welcome! I'm an AI assistant that can create visual cells based on your requests. You can ask me to create text-based cells or colored cells. For example, try asking 'Create 3 cells explaining the water cycle' or 'Make a color palette with 5 pastel colors'. What would you like to create?" }
    ]);
    const [generatedCells, setGeneratedCells] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messageInputRef = useRef(null);

    const callGroqAPI = async (message, conversationHistory) => {
        const GROQ_API_KEY = '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'; // Replace with your actual API key
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "Your job is to create cells in JSON. When you create multiple cells, as an array, they are for the purpose of displaying information in an easy to understand, and logical way. You can think of these cells as pages in a book, frames in a story, or slides in a deck. Keep in mind that you may only need one cell for simple tasks, and that some cases will require more consistent elements across cells.\nEach cell can either contain text or be colored. Text cells are defined with caption and content for each instance of text. Colored cells are defined with an RGB color value.\n{\"text\": [ { \"caption\": \"X\", \"content\": \"X\" } ]}\nor\n{\"color\": \"rgb(x, x, x)\"}\n\nText can contain any description of text. Whatever is fitting for the use case. \nWhatever the user asks for must be translated into visual cells. Each cell must start with cell_X starting with cell_0. Cells are wrapped in an array called \"cells\". Additionally, each cell should include a 'size' property that defines its width and height as a fraction of the container. For example, 'size': { 'width': '1/2', 'height': '1/3' } would make the cell half the width of the container and one-third the height. Take a break and generate in JSON"
                    },
                    ...conversationHistory,
                    {
                        role: "user",
                        content: message
                    }
                ],
                model: "llama-3.2-90b-text-preview",
                temperature: 0,
                max_tokens: 8192,
                top_p: 1,
                stream: false,
                response_format: {
                    type: "json_object"
                },
                stop: null
            })
        });

        const data = await response.json();
        const parsedContent = JSON.parse(data.choices[0].message.content);
        console.log('Parsed content:', parsedContent); // Debug: Log parsed content

        return parsedContent;
    };

    const sendMessage = async () => {
        const message = messageInputRef.current.value.trim();
        if (message) {
            setMessages(prevMessages => [
                ...prevMessages,
                { role: 'user', content: message }
            ]);
            setIsLoading(true);

            try {
                const conversationHistory = messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                const response = await callGroqAPI(message, conversationHistory);
                console.log('Received response:', response); // Debug: Log received response

                setGeneratedCells(response.cells || []);
                
                const aiResponse = response.response || 'Here are the generated cells based on your request.';
                setMessages(prevMessages => [
                    ...prevMessages,
                    { role: 'assistant', content: aiResponse }
                ]);
            } catch (error) {
                console.error('Error calling Groq API:', error);
                setMessages(prevMessages => [
                    ...prevMessages,
                    { role: 'assistant', content: 'Sorry, there was an error processing your request.' }
                ]);
            } finally {
                setIsLoading(false);
            }

            messageInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const messagesContainer = document.querySelector('#chat-box');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex h-screen relative">
            {isLoading && (
                <div className="absolute inset-0 bg-gray-500 bg-opacity-50 z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}
            <div className="w-2/3 bg-gray-200 p-4 overflow-auto">
                <div id="dynamic-container" className="flex flex-wrap gap-4" style={{ width: '100%' }}>
                    {generatedCells.map((cell, index) => {
                        console.log(`Rendering cell ${index}:`, cell); // Debug: Log each cell being rendered
                        const cellKey = `cell_${index}`;
                        const cellData = cell[cellKey];
                        
                        if (!cellData) {
                            console.error(`No data found for ${cellKey}`);
                            return null; // Skip rendering this cell
                        }

                        const width = cellData.size?.width || '1/1';
                        const height = cellData.size?.height || 'auto'; 
                        
                        // Convert fractions to percentages for more precise sizing
                        const widthPercentage = `calc(${width} * 100% - 1rem)`;
                        const heightPercentage = `calc(${height} * 100% - 1rem)`;
                        
                        const cellStyle = {
                            width: widthPercentage,
                            height: heightPercentage,
                            flexGrow: 0,
                            flexShrink: 0,
                            flexBasis: widthPercentage,
                            marginBottom: '1rem',
                            minHeight: '100px', // Add a minimum height to ensure visibility
                        };

                        if (cellData.color) {
                            cellStyle.backgroundColor = cellData.color;
                        }
                        
                        return (
                            <div 
                                key={index} 
                                className={`p-4 rounded-lg shadow-md ${cellData.color ? '' : 'bg-white'}`}
                                style={cellStyle}
                            >
                                {cellData.text ? (
                                    Array.isArray(cellData.text) ? cellData.text.map((textItem, textIndex) => (
                                        <div key={textIndex}>
                                            <p className="font-bold text-lg">{textItem.caption}</p>
                                            <p className="text-sm">{textItem.content}</p>
                                        </div>
                                    )) : (
                                        <p>No text content available</p>
                                    )
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="w-1/3 bg-gray-100 p-4 flex flex-col">
                <div id="chat-box" className="flex-grow overflow-y-auto bg-white p-4 rounded-lg mb-4">
                    {messages.map((message, index) => (
                        <Message key={index} role={message.role} content={message.content} />
                    ))}
                </div>
                <div className="flex">
                    <input
                        ref={messageInputRef}
                        type="text"
                        className="flex-grow p-2 border border-gray-300 rounded-l-lg"
                        placeholder="Type a message..."
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded-r-lg">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

function Message({ role, content }) {
    const isUser = role === 'user';
    const bgColor = isUser ? 'bg-blue-100' : 'bg-gray-100';

    return (
        <div className={`${bgColor} p-2 rounded-lg mb-2`}>
            <p className="font-bold">{isUser ? 'User' : 'AI Assistant'}</p>
            <p>{content}</p>
        </div>
    );
}

export default App;