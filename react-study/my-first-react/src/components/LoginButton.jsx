function LoginButton({isLoggedIn = false}) {
    return (
        <button>
            {isLoggedIn ? '로그아웃':'로그인'}
        </button>
    );
}

export default LoginButton;