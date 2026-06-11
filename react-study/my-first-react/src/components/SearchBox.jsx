function SearchBox(){
    function handleKeyDown(e){
        if (e.nativeEvent.isComposing) return;  // 한글 입력 중 Enter를 누를 때 keydown 이벤트가 조합 입력 때문에 중복처리가 될 수 있음

        if (e.key === 'Enter'){
            alert(e.target.value);
        }
    }
    return (
        <input type="text" onKeyDown={handleKeyDown}/>
    );
}

export default SearchBox;