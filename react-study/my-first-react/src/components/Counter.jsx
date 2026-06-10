import {useState} from 'react';

function Counter({min, max}){
    const [count, setCount] = useState(0);

    return (
        <div>
            <h2>카운트: {count}</h2>
            <button onClick={() => setCount(prev => Math.min(prev + 1, max))}>+1</button>
            <button onClick={() => setCount(prev => Math.max(prev - 1, min))}>-1</button>
            <button onClick={() => setCount(prev => Math.min(prev + 10, max))}>+10</button>
            <button onClick={() => setCount(0)}>reset</button>
        </div>
    )
}

export default Counter;