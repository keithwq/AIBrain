import sys, io, pathlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = pathlib.Path(r'D:\Project\AiBrain\frontend\src\pages\ChatPage.tsx')
content = p.read_text(encoding='utf-8')

old = """              const showTriPackage = !isUser && isQingheWriting && containsTriPackageMarkers(msg.content);
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group relative max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? 'rounded-tr-sm bg-emerald-900 text-white' : 'rounded-tl-sm border border-stone-200 bg-white text-stone-800'}`}>
                    {showTriPackage ? (
                      <TriPackageMessage
                        content={msg.content}
                        renderMarkdown={body => <MessageText content={body} />}
                        onCopy={(body, label) => {
                          navigator.clipboard.writeText(body);
                          showToast(`已复制${label}`, 'info');
                        }}
                      />
                    ) : (
                      <MessageText content={msg.content} dark={isUser} />
                    )}
                    <AttachmentList attachments={msg.attachments} dark={isUser} />
                    {!isUser && !showTriPackage && ("""

new = """              const showTriPackage = !isUser && isQingheWriting && containsTriPackageMarkers(msg.content);
              const showSunshaozhenPackage = !isUser && isSunshaozhen && containsSunshaozhenPackageMarkers(msg.content);
              const usePackageRenderer = showTriPackage || showSunshaozhenPackage;
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group relative max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? 'rounded-tr-sm bg-emerald-900 text-white' : 'rounded-tl-sm border border-stone-200 bg-white text-stone-800'}`}>
                    {showTriPackage ? (
                      <TriPackageMessage
                        content={msg.content}
                        renderMarkdown={body => <MessageText content={body} />}
                        onCopy={(body, label) => {
                          navigator.clipboard.writeText(body);
                          showToast(`已复制${label}`, 'info');
                        }}
                      />
                    ) : showSunshaozhenPackage ? (
                      <SunshaozhenPackageMessage
                        content={msg.content}
                        renderMarkdown={body => <MessageText content={body} />}
                        onCopy={(body, label) => {
                          navigator.clipboard.writeText(body);
                          showToast(`已复制${label}`, 'info');
                        }}
                      />
                    ) : (
                      <MessageText content={msg.content} dark={isUser} />
                    )}
                    <AttachmentList attachments={msg.attachments} dark={isUser} />
                    {!isUser && !usePackageRenderer && ("""

if old in content:
    content = content.replace(old, new, 1)
    p.write_text(content, encoding='utf-8')
    print("OK: render branch added")
else:
    print("NOT FOUND")
