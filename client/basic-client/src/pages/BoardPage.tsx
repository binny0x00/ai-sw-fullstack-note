/*
* 게시판 제목
* 글쓰기 버튼
* 검색 input
* 게시판 목록
* 페이징
*/
import './css/Board.css';
import {Link} from "react-router-dom";
import {useState, useEffect} from "react";
import {getPosts, type Post} from '../api';

function BoardPage() {
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchKeyword, setSearchKeyword] = useState("");

    useEffect(() => {
        async function fetchPosts() {
            try {
                const data = await getPosts(page, 10, searchKeyword);
                setPosts(data.items);
                setTotalPages(data.totalPages);
            } catch {
                alert('게시물 목록 조회 실패');
            }
        }

        fetchPosts();
    }, [page, searchKeyword]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setPage(1);
        setSearchKeyword(keyword);
    }

    return (
        <>
            <h1>게시판</h1>
            <div className="boardToolbar">
                <form className="boardSearchForm" onSubmit={handleSubmit}>
                    <input
                        type="search"
                        value={keyword}
                        placeholder="검색어를 입력하세요"
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <button type="submit">검색</button>
                </form>
                <Link to="/board/write" className="writeButton">글쓰기</Link>
            </div>
            {/*todo : 태그*/}

            <table className="boardTable">
                <thead>
                <tr>
                    <th>번호</th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>댓글수</th>
                </tr>
                </thead>

                <tbody>
                {posts.map((post: Post) => (
                    <tr key={post.id}>
                        <td>{post.id}</td>
                        <td>
                            <Link to={`/board/${post.id}`}>{post.title}</Link>
                        </td>
                        <td>{post.user?.nickname ?? post.userId}</td>
                        <td>0</td>
                    </tr>
                ))}
                </tbody>
            </table>

            <div className="boardPagination">
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    이전
                </button>

                <span>{page} / {totalPages}</span>

                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    다음
                </button>
            </div>
        </>
    );
}

export default BoardPage;