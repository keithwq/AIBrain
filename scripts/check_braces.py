import pathlib

src = pathlib.Path(r'D:\Project\AiBrain\frontend\src\pages\ChatPage.tsx').read_text(encoding='utf-8')

BACKSLASH = chr(92)  # avoid literal backslash in source

depth = 0
i = 0
line = 1
in_line_comment = False
in_block_comment = False
in_str = None
template_expr_stack = []
depths_by_line = {}

while i < len(src):
    c = src[i]
    nxt = src[i+1] if i+1 < len(src) else ''
    if c == '\n':
        depths_by_line[line] = depth
        line += 1
        in_line_comment = False
        i += 1
        continue
    if in_line_comment:
        i += 1
        continue
    if in_block_comment:
        if c == '*' and nxt == '/':
            in_block_comment = False
            i += 2
            continue
        i += 1
        continue
    if in_str in ("'", '"'):
        if c == BACKSLASH:
            i += 2
            continue
        if c == in_str:
            in_str = None
        i += 1
        continue
    if in_str == '`':
        if c == BACKSLASH:
            i += 2
            continue
        if c == '`':
            in_str = None
            i += 1
            continue
        if c == '$' and nxt == '{':
            template_expr_stack.append(depth)
            in_str = None
            depth += 1
            i += 2
            continue
        i += 1
        continue
    if c == '/' and nxt == '/':
        in_line_comment = True
        i += 2
        continue
    if c == '/' and nxt == '*':
        in_block_comment = True
        i += 2
        continue
    if c == "'" or c == '"':
        in_str = c
        i += 1
        continue
    if c == '`':
        in_str = '`'
        i += 1
        continue
    if c == '{':
        depth += 1
        i += 1
        continue
    if c == '}':
        depth -= 1
        if template_expr_stack and depth == template_expr_stack[-1]:
            template_expr_stack.pop()
            in_str = '`'
        i += 1
        continue
    i += 1

print(f"final depth: {depth}")
print(f"final line: {line}")
# Print depth at end of each ~100 lines and specific lines of interest
for ln in sorted(depths_by_line):
    d = depths_by_line[ln]
    if ln in (670, 675, 677, 680, 1600, 1610, 1620, 1628, 1629, 1630):
        print(f"line {ln}: depth={d}")
# Find the last line at depth 0 (outside any braces)
last_zero = max((ln for ln, d in depths_by_line.items() if d == 0), default=None)
print(f"last line at depth 0: {last_zero}")
print(f"depth at last line: {depths_by_line.get(line, depth)}")
