import {useState} from "react";

function MessageForm(){
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [lastSubmitted, setLastSubmitted] = useState(null);

    const isValid = name.length > 0  && message.length > 0;

    function handleSubmit(e){
        e.preventDefault();
        if (!isValid) return;
        setLastSubmitted({name, message});
        setName("");
        setMessage("");
    }

    function restHistory(){
        if (!lastSubmitted) return;
        setLastSubmitted(null);
    }

    return (
        <div style={{padding: '16px', border: '1px solid #ccc', borderRadius: '8px'}}>
            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        type="text"
                        placeholder="이름"    // 입력칸이 비어 있을 때 보여주는 안내 문구
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    {name.length === 0 && (
                        <span style={{color:'red', marginLeft:'8px'}}>이름을 입력하세요</span>
                    )}
                </div>

                <div style={{marginTop: '8px'}}>
                    <input
                        type="text"
                        placeholder="메시지"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    />
                    {message.length === 0 && (
                        <span style={{color:'red', marginLeft:'8px'}}>메시지를 입력하세요</span>
                    )}
                </div>

                <button type="submit" disabled={!isValid} style={{marginTop: '8px'}}>{isValid? '추가':'입력을 완료해주세요'}</button>
                <button onClick={restHistory} style={{marginTop: '8px'}}>리셋</button>
            </form>

            {lastSubmitted ? (
                <p style={{padding: '12px'}}>
                    마지막 입력: <strong>{lastSubmitted.name}</strong>. {lastSubmitted.message}
                </p>
            )
                : (
                    <p style={{marginTop: '12px', color: '#888'}}>아직 제출된 메시지가 없습니다.</p>
                )
            }
        </div>
    );
}

export default MessageForm;