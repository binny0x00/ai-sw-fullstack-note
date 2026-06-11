function UserStatus({user}){
    return (
        <div>
            {user ? (
                <p>안녕하세요, {user.name}님!</p>
            ) : (
                <p>로그인이 필요합니다.</p>
            )}
        </div>
    );
}

export default UserStatus;