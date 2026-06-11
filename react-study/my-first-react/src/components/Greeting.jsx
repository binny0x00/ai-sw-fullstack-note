function Greeting({user}){
    if (!user){
        return <p>로그인이 필요합니다.</p>
    }

    return <h1>안녕하세요, {user.name}님!</h1>
}

export default Greeting;