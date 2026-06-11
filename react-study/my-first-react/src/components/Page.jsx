function Page({status, data, error}){
    let content;

    if (status === 'loading'){
        content = <p>불러오는 중...</p>;
    } else if (status === 'error'){
        content = <p style={{color:'red'}}>에러: {error}</p>;
    } else {
        content = <p>데이터: {data}</p>;
    }

    return(
      <div>
          <h1>페이지 제목</h1>
          {content}
      </div>
    );
}

export default Page;