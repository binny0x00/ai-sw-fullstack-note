function FruitList(){
    const fruits = ['사과', '바나나', '체리'];

    /*
    * <ul>: 비정렬 목록
    * <ol>: 정렬 목록
    *
    * <ul>과 <ol>은 최소 하나 이상의 <li>요소를 자식으로 가져야 한다
    * */
    return(
        <ul>
            {fruits.map(
                fruit => (
                <li key={fruit}>{fruit}</li>
            )
            )}
        </ul>
    );
}

export default FruitList;