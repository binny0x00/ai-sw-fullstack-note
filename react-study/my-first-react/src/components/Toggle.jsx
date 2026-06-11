import {useState} from 'react';

function Toggle(){
    const [isOn, setIsOn] = useState(false);

    function handleToggle(){
        setIsOn(prev=>!prev);
    }

    return(
        <div>
            <p>현재 상태: {isOn?'ON':'OFF'}</p>
            <button onClick={handleToggle}>토글</button>
        </div>
    );
}

export default Toggle;