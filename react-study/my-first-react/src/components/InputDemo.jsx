import {useState} from "react";

function InputDemo(){
    const [text, setText] = useState('');

    function handleChange(e){
        setText(e.target.value);    // e.target: 이벤트가 발생한 DOM 요소
    }

    return(
        <div>
            <input type="text" value={text} onChange={handleChange} />
            <p>입력값: {text}</p>
        </div>
    );
}

export default InputDemo;