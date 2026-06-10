import {useState} from 'react';

function User(){
    const [info, setInfo] = useState({name: '철수', age: 30});

    return(
        <>
            <h3>이름: {info.name}, 나이: {info.age}</h3>
            <button onClick={() => setInfo(prev=> ({...prev, name: prev.name ==='철수'?'영희':'철수'}))}>이름 바꾸기</button>
            <button onClick={() => setInfo( prev => ({...prev, age: prev.age + 1}))}>나이 + 1</button>
        </>
    );
}

export default User;