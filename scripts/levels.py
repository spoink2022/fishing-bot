def f(x):
    return 1600 * (2 ** (x/20))

def clean(n, zeroes):
    n = int(n)
    return n - n % (10 ** zeroes)


first = 161
last = 200

for i in range(first, last + 1):
    exp = clean(f(i), 3)
    print('{\n\t"level": ' + str(i)  + ',\n\t"expRequired": ' + str(exp) + '\n},')
