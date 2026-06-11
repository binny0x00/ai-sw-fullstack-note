import {useState} from 'react';

function LoginForm(){
    const [email, setEmail] = useState('');

    function handleSubmit(e){
        e.preventDefault();
        console.log('제출된 이메일:', email);
    }

    return (
      <form onSubmit={handleSubmit}>
          <input type="email"
                 value={email}
                 onChange={(e)=>setEmail(e.target.value)}/>
          <button type="submit">로그인</button>
      </form>
    );
}

export default LoginForm;